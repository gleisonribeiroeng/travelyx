import { inject } from '@angular/core';
import { Router, type CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { TripStateService } from '../services/trip-state.service';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';

export const tripGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const tripState = inject(TripStateService);
  const router = inject(Router);
  const tripId = route.paramMap.get('tripId');

  if (!tripId) {
    router.navigate(['/viagens']);
    return false;
  }

  // If trips already loaded, check immediately
  const trips = tripState.trips();
  if (trips.length > 0) {
    const exists = trips.some(t => t.id === tripId);
    if (!exists) {
      router.navigate(['/viagens']);
      return false;
    }
    tripState.selectTrip(tripId);
    return true;
  }

  // Trips not loaded yet — load them first
  return tripState.loadFromApi().pipe(
    map((loadedTrips) => {
      const exists = loadedTrips.some(t => t.id === tripId);
      if (!exists) {
        router.navigate(['/viagens']);
        return false;
      }
      tripState.selectTrip(tripId);
      return true;
    })
  );
};
