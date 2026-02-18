import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { TripStateService } from '../../services/trip-state.service';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.scss',
})
export class RightPanelComponent {
  private readonly auth = inject(AuthService);
  private readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly trip = this.tripState.trip;

  readonly flightCount = computed(() => this.tripState.flights().length);
  readonly hotelCount = computed(() => this.tripState.stays().length);
  readonly activityCount = computed(() => this.tripState.activities().length);
  readonly hasTrip = computed(() =>
    !!this.trip().destination || this.flightCount() > 0 || this.hotelCount() > 0 || this.activityCount() > 0
  );

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
