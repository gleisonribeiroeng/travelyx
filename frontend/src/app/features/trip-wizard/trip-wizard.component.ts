import { Component, inject, computed, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TripStateService } from '../../core/services/trip-state.service';
import { filter } from 'rxjs/operators';

interface WizardStep {
  key: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-trip-wizard',
  standalone: true,
  imports: [RouterOutlet, MatIconModule, MatButtonModule],
  templateUrl: './trip-wizard.component.html',
  styleUrl: './trip-wizard.component.scss',
})
export class TripWizardComponent {
  private readonly router = inject(Router);
  private readonly tripState = inject(TripStateService);

  readonly steps: WizardStep[] = [
    { key: 'flights', label: 'Voos', icon: 'flight', route: '/planner/flights' },
    { key: 'hotels', label: 'Hotéis', icon: 'hotel', route: '/planner/hotels' },
    { key: 'cars', label: 'Carros', icon: 'directions_car', route: '/planner/cars' },
    { key: 'transport', label: 'Transporte', icon: 'directions_bus', route: '/planner/transport' },
    { key: 'tours', label: 'Passeios', icon: 'local_activity', route: '/planner/tours' },
    { key: 'attractions', label: 'Atrações', icon: 'museum', route: '/planner/attractions' },
    { key: 'review', label: 'Revisão', icon: 'checklist', route: '/planner/review' },
  ];

  readonly currentStepIndex = signal(0);
  readonly skippedSteps = signal<Set<string>>(new Set());

  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);
  readonly isReviewStep = computed(() => this.steps[this.currentStepIndex()]?.key === 'review');

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects || (e as NavigationEnd).url;
        const idx = this.steps.findIndex((s) => url.includes(s.route));
        if (idx >= 0) {
          this.currentStepIndex.set(idx);
        }
      });

    // Set initial index from current url
    const url = this.router.url;
    const idx = this.steps.findIndex((s) => url.includes(s.route));
    if (idx >= 0) {
      this.currentStepIndex.set(idx);
    }
  }

  isStepComplete(key: string): boolean {
    switch (key) {
      case 'flights': return this.tripState.flights().length > 0;
      case 'hotels': return this.tripState.stays().length > 0;
      case 'cars': return this.tripState.carRentals().length > 0;
      case 'transport': return this.tripState.transports().length > 0;
      case 'tours': return this.tripState.activities().length > 0;
      case 'attractions': return this.tripState.attractions().length > 0;
      case 'review': return false;
      default: return false;
    }
  }

  isStepSkipped(key: string): boolean {
    return this.skippedSteps().has(key);
  }

  isStepActive(index: number): boolean {
    return index === this.currentStepIndex();
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.router.navigate([this.steps[index].route]);
    }
  }

  nextStep(): void {
    const nextIdx = this.currentStepIndex() + 1;
    if (nextIdx < this.steps.length) {
      this.goToStep(nextIdx);
    }
  }

  prevStep(): void {
    const prevIdx = this.currentStepIndex() - 1;
    if (prevIdx >= 0) {
      this.goToStep(prevIdx);
    }
  }

  skipStep(): void {
    const currentKey = this.steps[this.currentStepIndex()].key;
    this.skippedSteps.update((set) => {
      const newSet = new Set(set);
      newSet.add(currentKey);
      return newSet;
    });
    this.nextStep();
  }
}
