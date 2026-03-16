import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Headers,
  RawBody,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * POST /api/stripe/checkout — create a Stripe Checkout session for PRO upgrade.
   * Returns { url } to redirect the user to.
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Request() req: any) {
    const url = await this.stripeService.createCheckoutSession(req.user.sub);
    return { url };
  }

  /**
   * POST /api/stripe/portal — create a Stripe Customer Portal session.
   * Returns { url } for the user to manage their subscription.
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@Request() req: any) {
    const url = await this.stripeService.createPortalSession(req.user.sub);
    return { url };
  }

  /**
   * POST /api/stripe/webhook — Stripe webhook handler.
   * Must receive raw body for signature verification.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event;
    try {
      event = this.stripeService.constructEvent(rawBody, signature);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Webhook signature verification failed');
    }

    this.logger.log(`Received webhook: ${event.type}`);
    await this.stripeService.handleWebhookEvent(event);

    return { received: true };
  }
}
