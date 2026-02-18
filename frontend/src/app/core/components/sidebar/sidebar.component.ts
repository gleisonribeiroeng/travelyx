import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

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

  mobileOpen = signal(false);

  navItems: NavItem[] = [
    { icon: 'home', label: 'Início', route: '/home' },
    { icon: 'auto_fix_high', label: 'Wizard da Viagem', route: '/planner', section: 'PLANEJAMENTO' },
    { icon: 'flight', label: 'Voos', route: '/search', section: 'PESQUISAS' },
    { icon: 'hotel', label: 'Hotéis', route: '/hotels' },
    { icon: 'directions_car', label: 'Carros', route: '/cars' },
    { icon: 'directions_bus', label: 'Transporte', route: '/transport' },
    { icon: 'local_activity', label: 'Passeios', route: '/tours' },
    { icon: 'museum', label: 'Atrações', route: '/attractions' },
    { icon: 'map', label: 'Roteiro', route: '/itinerary', section: 'MEU ROTEIRO' },
  ];

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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/landing']);
  }
}
