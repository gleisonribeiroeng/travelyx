import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly logger = new Logger(StripeService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
    } else {
      this.stripe = null;
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe features disabled');
    }
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200';
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) throw new Error('Stripe not configured');
    return this.stripe;
  }

  /**
   * Create or retrieve a Stripe customer for a user.
   */
  async getOrCreateCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true, name: true },
    });

    if (!user) throw new Error('User not found');

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.ensureStripe().customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for user ${userId}`);
    return customer.id;
  }

  /**
   * Create a Stripe Checkout session for PRO plan.
   */
  async createCheckoutSession(userId: string): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId);
    const priceId = this.config.get<string>('STRIPE_PRO_PRICE_ID');

    if (!priceId) {
      throw new Error('STRIPE_PRO_PRICE_ID not configured');
    }

    const session = await this.ensureStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/checkout/cancel`,
      subscription_data: {
        metadata: { userId },
      },
      metadata: { userId },
    });

    this.logger.log(`Created checkout session ${session.id} for user ${userId}`);
    return session.url!;
  }

  /**
   * Create a Stripe Customer Portal session (manage subscription).
   */
  async createPortalSession(userId: string): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId);

    const session = await this.ensureStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.frontendUrl}/viagens`,
    });

    return session.url;
  }

  /**
   * Construct and verify a Stripe webhook event.
   */
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')!;
    return this.ensureStripe().webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Handle relevant Stripe webhook events.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.metadata?.userId) {
          await this.activatePro(session.metadata.userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId || await this.findUserByCustomer(sub.customer as string);
        if (!userId) break;

        if (sub.status === 'active' || sub.status === 'trialing') {
          await this.activatePro(userId);
        } else {
          await this.deactivatePro(userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId || await this.findUserByCustomer(sub.customer as string);
        if (userId) {
          await this.deactivatePro(userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await this.findUserByCustomer(invoice.customer as string);
        if (userId) {
          this.logger.warn(`Payment failed for user ${userId}`);
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async activatePro(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: 'PRO', planExpiresAt: null },
    });
    this.logger.log(`Activated PRO plan for user ${userId}`);
  }

  private async deactivatePro(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: 'FREE', planExpiresAt: null },
    });
    this.logger.log(`Deactivated PRO plan for user ${userId}`);
  }

  private async findUserByCustomer(customerId: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    return user?.id || null;
  }
}
