import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="callback-container">
      <div class="spinner"></div>
      <p>Autenticando...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
      font-family: 'Open Sans', Roboto, sans-serif;
      color: var(--triply-text-primary);
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--triply-border);
      border-top-color: var(--triply-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 1rem; opacity: 0.7; }
  `],
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    console.log('[AUTH-CALLBACK] token present:', !!token);

    if (!token) {
      console.log('[AUTH-CALLBACK] No token found, going to landing');
      this.router.navigate(['/landing']);
      return;
    }

    // Save token and user info
    this.authService.handleCallback(token);
    console.log('[AUTH-CALLBACK] Logged in:', this.authService.isLoggedIn(), 'user:', this.authService.user()?.email);

    // Go straight to trips list
    this.router.navigate(['/viagens']);
  }
}
