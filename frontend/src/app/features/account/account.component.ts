import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/services/auth.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatDividerModule, MatChipsModule, TranslatePipe],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  protected readonly auth = inject(AuthService);
  protected readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(TranslationService);

  readonly user = this.auth.user;
  readonly plan = this.auth.plan;
  readonly totalTrips = computed(() => this.tripState.trips().length);

  readonly planLabel = computed(() => {
    const map: Record<string, string> = {
      FREE: this.i18n.t('account.planFree'),
      PRO: this.i18n.t('account.planPro'),
      BUSINESS: this.i18n.t('account.planBusiness'),
    };
    return map[this.plan()] || this.plan();
  });

  readonly memberSince = computed(() => {
    return this.i18n.t('account.memberSince');
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
