import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { TripStateService } from '../../services/trip-state.service';
import { TripRouterService } from '../../services/trip-router.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  section?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly tripState = inject(TripStateService);
  private readonly tripRouter = inject(TripRouterService);

  mobileOpen = signal(false);

  readonly navItems = computed<NavItem[]>(() => {
    const id = this.tripState.activeTripId();
    const base = id ? `/viagem/${id}` : '';

    const items: NavItem[] = [
      { icon: 'luggage', label: 'Minhas Viagens', route: '/viagens' },
    ];

    if (id) {
      items.push(
        { icon: 'dashboard', label: 'Dashboard', route: `${base}/home` },
        { icon: 'auto_fix_high', label: 'Wizard da Viagem', route: `${base}/planner`, section: 'PLANEJAMENTO' },
        { icon: 'flight', label: 'Voos', route: `${base}/search`, section: 'PESQUISAS' },
        { icon: 'hotel', label: 'Hotéis', route: `${base}/hotels` },
        { icon: 'directions_car', label: 'Carros', route: `${base}/cars` },
        { icon: 'directions_bus', label: 'Transporte', route: `${base}/transport` },
        { icon: 'local_activity', label: 'Passeios', route: `${base}/tours` },
        { icon: 'museum', label: 'Atrações', route: `${base}/attractions` },
        { icon: 'view_timeline', label: 'Timeline', route: `${base}/timeline`, section: 'MEU ROTEIRO' },
        { icon: 'map', label: 'Roteiro', route: `${base}/itinerary` },
        { icon: 'account_balance_wallet', label: 'Orçamento', route: `${base}/budget`, section: 'GESTÃO' },
        { icon: 'warning', label: 'Conflitos', route: `${base}/conflicts` },
        { icon: 'checklist', label: 'Checklist', route: `${base}/checklist` },
        { icon: 'folder', label: 'Documentos', route: `${base}/documents` },
      );
    }

    return items;
  });

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMobile();
  }

  openNewTrip(): void {
    this.router.navigate(['/viagens']);
    this.closeMobile();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/landing']);
  }
}
