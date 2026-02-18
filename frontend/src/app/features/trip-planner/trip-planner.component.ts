import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { AVAILABLE_COUNTRIES } from '../../core/data/destinations.data';
import {
  TripPlan,
  TravelerProfile,
  TripObjective,
  TransportPreference,
  FlightPaymentMethod,
  BreakfastPreference,
  SeasonInfo,
  LegalRequirements,
  TRAVELER_PROFILE_OPTIONS,
  TRIP_OBJECTIVE_OPTIONS,
  TRANSPORT_PREFERENCE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  POPULAR_AIRLINES,
} from '../../core/models/trip-plan.model';

@Component({
  selector: 'app-trip-planner',
  standalone: true,
  imports: [ReactiveFormsModule, ...MATERIAL_IMPORTS],
  templateUrl: './trip-planner.component.html',
  styleUrl: './trip-planner.component.scss',
})
export class TripPlannerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tripPlanService = inject(TripPlanService);

  // Option lists for template
  readonly countries = AVAILABLE_COUNTRIES;
  readonly profileOptions = TRAVELER_PROFILE_OPTIONS;
  readonly objectiveOptions = TRIP_OBJECTIVE_OPTIONS;
  readonly transportOptions = TRANSPORT_PREFERENCE_OPTIONS;
  readonly paymentOptions = PAYMENT_METHOD_OPTIONS;
  readonly airlines = POPULAR_AIRLINES;

  // Reactive state
  readonly selectedObjectives = signal<TripObjective[]>([]);
  readonly selectedAirlines = signal<string[]>([]);
  readonly seasonInfo = signal<SeasonInfo | null>(null);
  readonly legalInfo = signal<LegalRequirements | null>(null);
  readonly destinationMeta = signal<{ currency: string; language: string; timezone: string } | null>(null);

  readonly minDate = new Date();
  readonly starsLabel = signal('3');

  // Forms for each step
  destinationForm!: FormGroup;
  datesForm!: FormGroup;
  travelersForm!: FormGroup;
  transportForm!: FormGroup;
  accommodationForm!: FormGroup;

  // Computed: has any legal alert
  readonly hasLegalAlerts = computed(() => {
    const legal = this.legalInfo();
    if (!legal) return false;
    return legal.passportRequired || legal.visaRequired || legal.insuranceRequired || legal.vaccines.length > 0;
  });

  ngOnInit(): void {
    this.destinationForm = this.fb.group({
      city: ['', Validators.required],
      country: ['', Validators.required],
      region: [''],
    });

    this.datesForm = this.fb.group({
      departure: ['', Validators.required],
      returnDate: [''],
      duration: [7, [Validators.min(1), Validators.max(365)]],
      useDuration: [false],
    });

    this.travelersForm = this.fb.group({
      adults: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
      children: [0, [Validators.min(0), Validators.max(10)]],
      elderly: [0, [Validators.min(0), Validators.max(10)]],
      profile: ['couple' as TravelerProfile, Validators.required],
    });

    this.transportForm = this.fb.group({
      preference: ['plane' as TransportPreference, Validators.required],
      paymentMethod: ['cash' as FlightPaymentMethod, Validators.required],
    });

    this.accommodationForm = this.fb.group({
      minStars: [3],
      flexibleCancellation: [false],
      breakfastIncluded: ['indifferent' as BreakfastPreference],
      proximityTo: [''],
    });
  }

  onCountryChange(): void {
    const country = this.destinationForm.get('country')?.value;
    if (!country) {
      this.destinationMeta.set(null);
      this.legalInfo.set(null);
      return;
    }

    const meta = this.tripPlanService.getDestinationMetadata(country);
    if (meta) {
      this.destinationMeta.set({
        currency: meta.currency,
        language: meta.language,
        timezone: meta.timezone,
      });
      this.legalInfo.set(meta.legal);
    } else {
      this.destinationMeta.set(null);
      this.legalInfo.set(null);
    }
  }

  onDepartureChange(): void {
    this.updateSeasonInfo();
    this.syncDates();
  }

  onReturnChange(): void {
    const dep = this.datesForm.get('departure')?.value;
    const ret = this.datesForm.get('returnDate')?.value;
    if (dep && ret) {
      const depDate = new Date(dep);
      const retDate = new Date(ret);
      const diff = Math.ceil((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) {
        this.datesForm.get('duration')?.setValue(diff, { emitEvent: false });
      }
    }
  }

  onDurationChange(): void {
    this.syncDates();
  }

  private syncDates(): void {
    const dep = this.datesForm.get('departure')?.value;
    const useDuration = this.datesForm.get('useDuration')?.value;
    const duration = this.datesForm.get('duration')?.value;

    if (dep && useDuration && duration > 0) {
      const depDate = new Date(dep);
      const retDate = new Date(depDate);
      retDate.setDate(retDate.getDate() + duration);
      this.datesForm.get('returnDate')?.setValue(retDate, { emitEvent: false });
    }
  }

  private updateSeasonInfo(): void {
    const country = this.destinationForm.get('country')?.value;
    const dep = this.datesForm.get('departure')?.value;
    if (country && dep) {
      const depDate = new Date(dep);
      const month = depDate.getMonth() + 1;
      this.seasonInfo.set(this.tripPlanService.getSeasonInfo(country, month));
    }
  }

  onTravelersChange(): void {
    const adults = this.travelersForm.get('adults')?.value || 1;
    const children = this.travelersForm.get('children')?.value || 0;
    const inferred = this.tripPlanService.inferProfile(adults, children);
    this.travelersForm.get('profile')?.setValue(inferred, { emitEvent: false });
  }

  toggleObjective(obj: TripObjective): void {
    const current = this.selectedObjectives();
    if (current.includes(obj)) {
      this.selectedObjectives.set(current.filter(o => o !== obj));
    } else {
      this.selectedObjectives.set([...current, obj]);
    }
  }

  isObjectiveSelected(obj: TripObjective): boolean {
    return this.selectedObjectives().includes(obj);
  }

  toggleAirline(code: string): void {
    const current = this.selectedAirlines();
    if (current.includes(code)) {
      this.selectedAirlines.set(current.filter(c => c !== code));
    } else {
      this.selectedAirlines.set([...current, code]);
    }
  }

  isAirlineSelected(code: string): boolean {
    return this.selectedAirlines().includes(code);
  }

  onStarsChange(value: number): void {
    this.starsLabel.set(value.toString());
    this.accommodationForm.get('minStars')?.setValue(value);
  }

  formatStarsLabel(value: number): string {
    return `${value}★`;
  }

  isTransportPlane(): boolean {
    return this.transportForm.get('preference')?.value === 'plane';
  }

  finishPlanning(): void {
    if (!this.destinationForm.valid || !this.datesForm.valid) return;

    const dep = this.datesForm.get('departure')?.value;
    const ret = this.datesForm.get('returnDate')?.value;
    const depStr = dep instanceof Date ? dep.toISOString().split('T')[0] : dep;
    const retStr = ret instanceof Date ? ret.toISOString().split('T')[0] : (ret || depStr);

    const plan: TripPlan = {
      destination: {
        city: this.destinationForm.get('city')?.value,
        country: this.destinationForm.get('country')?.value,
        region: this.destinationForm.get('region')?.value || '',
        currency: this.destinationMeta()?.currency || '',
        language: this.destinationMeta()?.language || '',
        timezone: this.destinationMeta()?.timezone || '',
        isHighSeason: this.seasonInfo()?.isHighSeason ?? false,
      },
      dates: {
        departure: depStr,
        returnDate: retStr,
        duration: this.datesForm.get('duration')?.value || 7,
      },
      travelers: {
        adults: this.travelersForm.get('adults')?.value,
        children: this.travelersForm.get('children')?.value,
        elderly: this.travelersForm.get('elderly')?.value,
        profile: this.travelersForm.get('profile')?.value,
      },
      objectives: this.selectedObjectives(),
      transport: {
        preference: this.transportForm.get('preference')?.value,
        preferredAirlines: this.selectedAirlines(),
        paymentMethod: this.transportForm.get('paymentMethod')?.value,
      },
      accommodation: {
        minStars: this.accommodationForm.get('minStars')?.value,
        flexibleCancellation: this.accommodationForm.get('flexibleCancellation')?.value,
        breakfastIncluded: this.accommodationForm.get('breakfastIncluded')?.value,
        proximityTo: this.accommodationForm.get('proximityTo')?.value || '',
      },
    };

    this.tripPlanService.savePlan(plan);
    this.router.navigate(['/home']);
  }
}
