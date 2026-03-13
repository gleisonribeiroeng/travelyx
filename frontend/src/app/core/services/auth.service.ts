import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type Plan = 'FREE' | 'PRO' | 'BUSINESS';

export interface AuthUser {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  role: string;
  plan: Plan;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'triply_token';
  private readonly USER_KEY = 'triply_user';

  private readonly _user = signal<AuthUser | null>(this.loadUser());
  private readonly _token = signal<string | null>(this.loadToken());

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly plan = computed<Plan>(() => this._user()?.plan || 'FREE');
  readonly isPro = computed(() => {
    const p = this.plan();
    return p === 'PRO' || p === 'BUSINESS' || this.isAdmin();
  });
  readonly isBusiness = computed(() => this.plan() === 'BUSINESS' || this.isAdmin());

  constructor(private readonly http: HttpClient) {}

  getGoogleLoginUrl(): string {
    return `${environment.apiBaseUrl}/api/auth/google`;
  }

  /**
   * Opens Google login in a centered popup window.
   * Returns a Promise that resolves when login completes.
   */
  loginWithPopup(): Promise<void> {
    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      const popup = window.open(
        this.getGoogleLoginUrl(),
        'google-login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
      );

      if (!popup) {
        // Popup blocked — fallback to redirect
        window.location.href = this.getGoogleLoginUrl();
        return;
      }

      const onMessage = (event: MessageEvent) => {
        if (event.data?.type !== 'triply-auth') return;

        window.removeEventListener('message', onMessage);
        clearInterval(pollTimer);

        const token = event.data.token;
        if (token) {
          this.handleCallback(token);
          resolve();
        } else {
          reject(new Error('Login cancelado'));
        }
      };

      window.addEventListener('message', onMessage);

      // Poll in case user closes popup without completing login
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', onMessage);
          // Check if login happened (token may have been set)
          if (!this._token()) {
            reject(new Error('Login cancelado'));
          }
        }
      }, 500);
    });
  }

  handleCallback(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this._token.set(token);

    // Decode JWT payload to get user info
    const payload = this.decodeJwt(token);
    if (payload) {
      const user: AuthUser = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        role: payload.role || 'USER',
        plan: payload.plan || 'FREE',
      };
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this._user.set(user);
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }

  getToken(): string | null {
    return this._token();
  }

  private loadToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private loadUser(): AuthUser | null {
    const stored = localStorage.getItem(this.USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private decodeJwt(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}
