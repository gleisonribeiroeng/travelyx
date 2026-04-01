import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { AuthService } from '../../core/services/auth.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { BadgeService } from '../../core/services/badge.service';
import { StreakService } from '../../core/services/streak.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [MATERIAL_IMPORTS, FormsModule, TranslatePipe],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  protected readonly auth = inject(AuthService);
  protected readonly tripState = inject(TripStateService);
  protected readonly badgeService = inject(BadgeService);
  protected readonly streak = inject(StreakService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(TranslationService);

  readonly user = this.auth.user;
  readonly plan = this.auth.plan;
  readonly totalTrips = computed(() => this.tripState.trips().length);

  readonly editingName = signal(false);
  readonly editingMotto = signal(false);
  readonly motto = signal(localStorage.getItem('travelyx_motto') || '');

  readonly planLabel = computed(() => {
    const map: Record<string, string> = {
      FREE: this.i18n.t('account.planFree'),
      PRO: this.i18n.t('account.planPro'),
      BUSINESS: this.i18n.t('account.planBusiness'),
    };
    return map[this.plan()] || this.plan();
  });

  /** Unique destinations from all trips */
  readonly uniqueDestinations = computed(() => {
    const trips = this.tripState.trips();
    const dests = trips.map(t => t.destination).filter(Boolean);
    return [...new Set(dests)];
  });

  goBack(): void {
    window.history.back();
  }

  saveName(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value) {
      // Name editing is visual only — would need backend API to persist
      // For now just close the edit mode
    }
    this.editingName.set(false);
  }

  saveMotto(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.motto.set(value);
    localStorage.setItem('travelyx_motto', value);
    this.editingMotto.set(false);
  }

  upgradePlan(): void {
    this.router.navigate(['/checkout/success']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/landing']);
  }
}
