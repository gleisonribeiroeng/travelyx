import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { TransitionService } from '../../core/services/transition.service';

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
  private readonly tripState = inject(TripStateService);
  private readonly transition = inject(TransitionService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.router.navigate(['/landing']);
      return;
    }

    // Detect if running inside the login popup (window.name persists through redirects)
    const isPopup = window.name === 'triply-google-login';

    if (isPopup) {
      // Save token to localStorage — parent window detects this via 'storage' event
      this.authService.handleCallback(token);
      // Close the popup
      window.close();
      return;
    }

    // Normal redirect flow
    this.authService.handleCallback(token);
    this.transition.start();

    this.tripState.loadFromApi().subscribe({
      next: (trips) => {
        if (trips.length === 1) {
          this.router.navigate(['/viagem', trips[0].id, 'home']);
        } else {
          this.router.navigate(['/viagens']);
        }
      },
      error: () => {
        this.router.navigate(['/viagens']);
      },
    });
  }
}
