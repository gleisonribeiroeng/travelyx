import { Component, inject, signal, viewChild } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { TopBarComponent } from './core/components/top-bar/top-bar.component';
import { RightPanelComponent } from './core/components/right-panel/right-panel.component';
import { AuthService } from './core/services/auth.service';
import { TripStateService } from './core/services/trip-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent, RightPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly tripState = inject(TripStateService);
  readonly isLandingPage = signal(!this.auth.isLoggedIn());
  readonly sidebar = viewChild(SidebarComponent);

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        const url = e.urlAfterRedirects;
        this.isLandingPage.set(
          url.startsWith('/landing') || url.startsWith('/auth/callback') ||
          url.startsWith('/voos') || url.startsWith('/hoteis') || url.startsWith('/passeios')
        );
      });

    if (this.auth.isLoggedIn()) {
      this.tripState.loadFromApi().subscribe();
    }
  }

  onHamburgerClick(): void {
    this.sidebar()?.toggleMobile();
  }
}
