import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { TripStateService } from '../../services/trip-state.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);
  readonly hamburgerClick = output<void>();

  onHamburgerClick(): void {
    this.hamburgerClick.emit();
  }

  switchTrip(tripId: string): void {
    this.tripState.selectTrip(tripId);
    this.router.navigate(['/viagem', tripId, 'home']);
  }

  goToTripList(): void {
    this.router.navigate(['/viagens']);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      planejamento: 'Planejamento',
      ativa: 'Em viagem',
      concluida: 'Concluída',
    };
    return map[status] || status;
  }
}
