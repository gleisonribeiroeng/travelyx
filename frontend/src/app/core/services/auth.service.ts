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
    return p === 'PRO' || p === 'BUSINESS';
  });
  readonly isBusiness = computed(() => this.plan() === 'BUSINESS');

  constructor(private readonly http: HttpClient) {}

  getGoogleLoginUrl(): string {
    return `${environment.apiBaseUrl}/api/auth/google`;
  }

  /**
   * Opens Google login in a centered popup window.
   * Uses localStorage 'storage' event to detect when the popup completes login.
   * This is reliable even after cross-origin Google OAuth redirects
   * (which null out window.opener).
   */
  loginWithPopup(): Promise<void> {
    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      // Clear token so we can detect when the popup sets it
      const hadToken = !!this._token();

      const popup = window.open(
        this.getGoogleLoginUrl(),
        'triply-google-login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
      );

      if (!popup) {
        window.location.href = this.getGoogleLoginUrl();
        return;
      }

      const cleanup = () => {
        window.removeEventListener('storage', onStorage);
        clearInterval(pollTimer);
      };

      // 'storage' event fires in the PARENT when another tab/popup writes to localStorage
      const onStorage = (e: StorageEvent) => {
        if (e.key !== this.TOKEN_KEY || !e.newValue) return;
        cleanup();
        // Reload signals from localStorage (popup already wrote them)
        this._token.set(e.newValue);
        const user = this.loadUser();
        if (user) this._user.set(user);
        // Close popup if still open
        try { popup.close(); } catch { /* cross-origin */ }
        resolve();
      };

      window.addEventListener('storage', onStorage);

      // Poll to detect popup closed without login
      const pollTimer = setInterval(() => {
        if (!popup.closed) return;
        cleanup();
        // Check if token was set (race condition safety)
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (token && !hadToken) {
          this._token.set(token);
          const user = this.loadUser();
          if (user) this._user.set(user);
          resolve();
        } else if (token !== this._token()) {
          this._token.set(token);
          const user = this.loadUser();
          if (user) this._user.set(user);
          resolve();
        } else {
          reject(new Error('Login cancelado'));
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
