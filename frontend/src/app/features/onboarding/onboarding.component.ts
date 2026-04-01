import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { StreakService } from '../../core/services/streak.service';
import { TranslationService } from '../../core/i18n/translation.service';

type TravelerType = 'backpacker' | 'family' | 'couple' | 'friends' | 'business';
type PlanningFocus = 'economy' | 'value' | 'comfort';
type TripIntent = 'has_trip' | 'exploring' | 'browsing';

interface OnboardingData {
  travelerType: TravelerType | null;
  planningFocus: PlanningFocus | null;
  tripIntent: TripIntent | null;
}

const ONBOARDING_DONE_KEY = 'travelyx_onboarding_done';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly streak = inject(StreakService);
  private readonly i18n = inject(TranslationService);

  readonly step = signal(0);
  readonly data = signal<OnboardingData>({
    travelerType: null,
    planningFocus: null,
    tripIntent: null,
  });

  readonly userName = computed(() => this.auth.user()?.name || '');
  readonly userPicture = computed(() => this.auth.user()?.picture || '');

  readonly travelerTypes: { value: TravelerType; icon: string; label: string; desc: string }[] = [
    { value: 'backpacker', icon: '🎒', label: 'Mochileiro', desc: 'Hostel, transporte público, muita aventura' },
    { value: 'family', icon: '👨‍👩‍👧‍👦', label: 'Família', desc: 'Conforto, segurança, atividades para todos' },
    { value: 'couple', icon: '💑', label: 'Casal', desc: 'Romântico, experiências especiais' },
    { value: 'friends', icon: '👥', label: 'Amigos', desc: 'Dividir tudo, muita diversão' },
    { value: 'business', icon: '💼', label: 'Trabalho', desc: 'Prático, rápido, sem enrolação' },
  ];

  readonly focusOptions: { value: PlanningFocus; label: string }[] = [
    { value: 'economy', label: 'Economizar ao máximo' },
    { value: 'value', label: 'Melhor custo-benefício' },
    { value: 'comfort', label: 'Conforto acima de tudo' },
  ];

  readonly intentOptions: { value: TripIntent; label: string }[] = [
    { value: 'has_trip', label: 'Sim, já sei para onde vou!' },
    { value: 'exploring', label: 'Estou pesquisando destinos' },
    { value: 'browsing', label: 'Só quero explorar o app' },
  ];

  /** Check if onboarding was already completed */
  static isCompleted(): boolean {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true';
  }

  nextStep(): void {
    this.step.update(s => s + 1);
  }

  skip(): void {
    this.complete();
  }

  selectTravelerType(type: TravelerType): void {
    this.data.update(d => ({ ...d, travelerType: type }));
  }

  selectFocus(focus: PlanningFocus): void {
    this.data.update(d => ({ ...d, planningFocus: focus }));
  }

  selectIntent(intent: TripIntent): void {
    this.data.update(d => ({ ...d, tripIntent: intent }));
  }

  finishProfile(): void {
    // Save preferences
    const d = this.data();
    localStorage.setItem('travelyx_profile', JSON.stringify({
      travelerType: d.travelerType,
      planningFocus: d.planningFocus,
      tripIntent: d.tripIntent,
    }));

    if (d.tripIntent === 'has_trip') {
      this.nextStep(); // Go to step 2 (create trip)
    } else {
      this.complete();
    }
  }

  complete(): void {
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    this.streak.recordActivity();
    this.router.navigate(['/viagens']);
  }
}
