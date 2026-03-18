import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/services/auth.service';
import { TripStateService } from '../../core/services/trip-state.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatDividerModule, MatChipsModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  protected readonly auth = inject(AuthService);
  protected readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly plan = this.auth.plan;
  readonly totalTrips = computed(() => this.tripState.trips().length);

  readonly planLabel = computed(() => {
    const map: Record<string, string> = {
      FREE: 'Gratuito',
      PRO: 'Pro',
      BUSINESS: 'Business',
    };
    return map[this.plan()] || this.plan();
  });

  readonly memberSince = computed(() => {
    // Approximate from JWT — no exact field available
    return 'Membro desde 2025';
  });

  goBack(): void {
    window.history.back();
  }

  upgradePlan(): void {
    this.router.navigate(['/checkout/success']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/landing']);
  }
}
