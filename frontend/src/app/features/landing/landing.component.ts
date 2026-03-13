import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  inject,
  ElementRef,
  NgZone,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { AuthService } from '../../core/services/auth.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { TransitionService } from '../../core/services/transition.service';
import {
  HomeShowcaseApiService,
  FeaturedDestination,
} from '../../core/api/home-showcase-api.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(HomeShowcaseApiService);
  private readonly el = inject(ElementRef);
  readonly authService = inject(AuthService);
  private readonly tripState = inject(TripStateService);
  private readonly transition = inject(TransitionService);

  private readonly fallbackDestinations: FeaturedDestination[] = [
    {
      city: 'Rio de Janeiro',
      tag: 'Praia',
      flightFrom: 189,
      image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
    },
    {
      city: 'Paris',
      tag: 'Cultura',
      flightFrom: 2890,
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
    },
    {
      city: 'Lisboa',
      tag: 'Internacional',
      flightFrom: 2490,
      image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80',
    },
  ];

  readonly destinations = signal<FeaturedDestination[]>(this.fallbackDestinations);
  readonly stats = signal({ destinations: 0, tripsPlanned: 0, reviews: 0 });
  readonly loading = signal(false);

  // Hero device carousel
  readonly screens = ['dashboard', 'flights', 'hotels', 'timeline'];
  readonly activeScreen = signal(0);
  private screenTimer?: ReturnType<typeof setInterval>;

  private observer!: IntersectionObserver;
  private readonly zone = inject(NgZone);

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
    this.api.getShowcase().subscribe({
      next: (res) => {
        this.stats.set(res.stats);
      },
      error: () => {},
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            this.observer.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    (this.el.nativeElement as HTMLElement)
      .querySelectorAll('.reveal')
      .forEach((el) => this.observer.observe(el));

    // Auto-rotate hero screens outside Angular zone to avoid change detection
    this.zone.runOutsideAngular(() => {
      this.screenTimer = setInterval(() => {
        this.zone.run(() => {
          this.activeScreen.update((i) => (i + 1) % this.screens.length);
        });
      }, 3500);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.screenTimer) clearInterval(this.screenTimer);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  loginWithGoogle(): void {
    this.authService.loginWithPopup().then(() => {
      this.transition.start();
      this.tripState.loadFromApi().subscribe((trips) => {
        if (trips.length === 1) {
          this.router.navigate(['/viagem', trips[0].id, 'home']);
        } else {
          this.router.navigate(['/viagens']);
        }
      });
    }).catch(() => {
      // User closed popup without logging in — do nothing
    });
  }

  scrollToSection(id: string): void {
    (this.el.nativeElement as HTMLElement)
      .querySelector(`#${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToScreen(index: number): void {
    this.activeScreen.set(index);
    // Reset timer on manual click
    if (this.screenTimer) clearInterval(this.screenTimer);
    this.zone.runOutsideAngular(() => {
      this.screenTimer = setInterval(() => {
        this.zone.run(() => {
          this.activeScreen.update((i) => (i + 1) % this.screens.length);
        });
      }, 3500);
    });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.closest('.dest-card-img')?.classList.add('img-fallback');
  }
}
