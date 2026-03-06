import { Component, inject, output, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { TripStateService } from '../../services/trip-state.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  protected readonly tripState = inject(TripStateService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly hamburgerClick = output<void>();

  readonly firstName = computed(() => {
    const name = this.auth.user()?.name;
    return name ? name.split(' ')[0] : '';
  });

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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/landing']);
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
