import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /**
   * Redirect user to Stripe Checkout for PRO upgrade.
   */
  async checkout(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>(`${environment.apiBaseUrl}/api/stripe/checkout`, {}),
    );
    window.location.href = url;
  }

  /**
   * Redirect user to Stripe Customer Portal (manage subscription).
   */
  async portal(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>(`${environment.apiBaseUrl}/api/stripe/portal`, {}),
    );
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
