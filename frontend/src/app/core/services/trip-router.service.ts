import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TripStateService } from './trip-state.service';

@Injectable({ providedIn: 'root' })
export class TripRouterService {
  private readonly router = inject(Router);
  private readonly tripState = inject(TripStateService);

  navigate(subPath: string): void {
    const id = this.tripState.activeTripId();
    if (!id) {
      this.router.navigate(['/viagens']);
      return;
    }
    this.router.navigate(['/viagem', id, ...subPath.split('/')]);
  }

  getRoute(subPath: string): string {
    const id = this.tripState.activeTripId();
    if (!id) return '/viagens';
    return `/viagem/${id}/${subPath}`;
  }

  getRouteArray(subPath: string): string[] {
    const id = this.tripState.activeTripId();
    if (!id) return ['/viagens'];
    return ['/viagem', id, ...subPath.split('/')];
  }
}
