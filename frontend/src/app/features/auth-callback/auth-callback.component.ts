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

    // If opened inside a popup, send token to parent and close
    if (window.opener) {
      window.opener.postMessage({ type: 'triply-auth', token }, window.location.origin);
      window.close();
      return;
    }

    // Normal redirect flow (fallback if popup was blocked)
    this.authService.handleCallback(token);
    this.transition.start();

    this.tripState.loadFromApi().subscribe((trips) => {
      if (trips.length === 1) {
        this.router.navigate(['/viagem', trips[0].id, 'home']);
      } else {
        this.router.navigate(['/viagens']);
      }
    });
  }
}
