import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { TripStateService } from '../../services/trip-state.service';
import { TripRouterService } from '../../services/trip-router.service';
import { PlanService } from '../../services/plan.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  pro?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly tripState = inject(TripStateService);
  private readonly tripRouter = inject(TripRouterService);
  protected readonly planService = inject(PlanService);

  mobileOpen = signal(false);

  readonly navGroups = computed<NavGroup[]>(() => {
    const id = this.tripState.activeTripId();
    const base = id ? `/viagem/${id}` : '';

    if (!id) {
      return [
        { label: '', items: [
          { icon: 'luggage', label: 'Minhas Viagens', route: '/viagens' },
        ]},
      ];
    }

    return [
      { label: '', items: [
        { icon: 'luggage', label: 'Minhas Viagens', route: '/viagens' },
        { icon: 'space_dashboard', label: 'Visão Geral', route: `${base}/home` },
      ]},
      { label: 'Planejamento', items: [
        { icon: 'route', label: 'Planejamento Guiado', route: `${base}/planner` },
      ]},
      { label: 'Explorar', items: [
        { icon: 'flight', label: 'Voos', route: `${base}/search` },
        { icon: 'hotel', label: 'Hotéis', route: `${base}/hotels` },
        { icon: 'directions_car', label: 'Carros', route: `${base}/cars` },
        { icon: 'local_activity', label: 'Passeios', route: `${base}/tours` },
        { icon: 'museum', label: 'Atrações', route: `${base}/attractions` },
      ]},
      { label: 'Roteiro', items: [
        { icon: 'event_note', label: 'Agenda', route: `${base}/itinerary` },
        { icon: 'timeline', label: 'Linha do Tempo', route: `${base}/timeline` },
      ]},
      { label: 'Organização', items: [
        { icon: 'account_balance_wallet', label: 'Orçamento', route: `${base}/budget`, pro: true },
        { icon: 'notification_important', label: 'Alertas', route: `${base}/conflicts`, pro: true },
        { icon: 'checklist', label: 'Checklist', route: `${base}/checklist`, pro: true },
        { icon: 'description', label: 'Documentos', route: `${base}/documents`, pro: true },
      ]},
    ];
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
