import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Security: validate redirect URL is from a trusted domain */
  private isSafeRedirect(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' &&
        (parsed.hostname === 'checkout.stripe.com' ||
         parsed.hostname === 'billing.stripe.com' ||
         parsed.hostname.endsWith('.stripe.com'));
    } catch {
      return false;
    }
  }

  /**
   * Redirect user to Stripe Checkout for PRO upgrade.
   */
  async checkout(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>(`${environment.apiBaseUrl}/api/stripe/checkout`, {}),
    );
    if (!this.isSafeRedirect(url)) throw new Error('Invalid checkout URL');
    window.location.href = url;
  }

  /**
   * Redirect user to Stripe Customer Portal (manage subscription).
   */
  async portal(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>(`${environment.apiBaseUrl}/api/stripe/portal`, {}),
    );
    if (!this.isSafeRedirect(url)) throw new Error('Invalid portal URL');
    window.location.href = url;
  }

  /**
   * Refresh the JWT token to pick up plan changes from Stripe webhook.
   */
  async refreshToken(): Promise<void> {
    const { token } = await firstValueFrom(
      this.http.get<{ token: string }>(`${environment.apiBaseUrl}/api/auth/refresh-token`),
    );
    this.auth.handleCallback(token);
  }
}
