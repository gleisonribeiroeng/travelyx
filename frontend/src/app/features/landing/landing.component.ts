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
import { DecimalPipe, AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DynamicCurrencyPipe } from '../../core/i18n/dynamic-currency.pipe';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TripStateService } from '../../core/services/trip-state.service';
import { TransitionService } from '../../core/services/transition.service';
import { SeoService } from '../../core/services/seo.service';
import {
  HomeShowcaseApiService,
  FeaturedDestination,
} from '../../core/api/home-showcase-api.service';
import { HotelApiService, DestinationOption } from '../../core/api/hotel-api.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, DynamicCurrencyPipe, DecimalPipe, AsyncPipe, TranslatePipe, ReactiveFormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(HomeShowcaseApiService);
  private readonly el = inject(ElementRef);
  readonly authService = inject(AuthService);
  readonly i18n = inject(TranslationService);
  private readonly tripState = inject(TripStateService);
  private readonly transition = inject(TransitionService);
  private readonly seo = inject(SeoService);
  private readonly hotelApi = inject(HotelApiService);

  // Hero search
  readonly heroDestControl = new FormControl('');
  filteredHeroDests$!: Observable<DestinationOption[]>;
  selectedHeroDest = signal<DestinationOption | null>(null);
  readonly heroQuickDests = [
    { label: 'Rio de Janeiro', emoji: '🏖️' },
    { label: 'Paris', emoji: '🗼' },
    { label: 'Lisboa', emoji: '🏛️' },
    { label: 'Orlando', emoji: '🎢' },
    { label: 'Buenos Aires', emoji: '💃' },
  ];

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
  readonly screens = ['hotels', 'checklist', 'timeline'];
  readonly activeScreen = signal(0);
  private screenTimer?: ReturnType<typeof setInterval>;

  readonly navScrolled = signal(false);
  private scrollHandler?: () => void;

  private observer!: IntersectionObserver;
  private readonly zone = inject(NgZone);

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Travelyx - Planeje sua viagem com inteligência',
      description: 'Planeje sua viagem completa: voos, hotéis, aluguel de carros e roteiros personalizados. Compare preços e organize tudo em um só lugar gratuitamente.',
      url: 'https://travelyx.com.br',
      keywords: 'planejamento de viagem, voos baratos, hotéis, aluguel de carros, roteiro de viagem, travelyx, viagem barata, passagens aéreas',
    });

    this.filteredHeroDests$ = this.heroDestControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => {
        if (!val || typeof val !== 'string' || val.length < 2) return of([]);
        return this.hotelApi.searchDestinations(val).pipe(catchError(() => of([])));
      })
    );

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

      // Nav scroll effect
      this.scrollHandler = () => {
        const scrolled = window.scrollY > 40;
        if (scrolled !== this.navScrolled()) {
          this.zone.run(() => this.navScrolled.set(scrolled));
        }
      };
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.screenTimer) clearInterval(this.screenTimer);
    if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  loginWithGoogle(): void {
    // Use direct redirect — more reliable across domains and popup blockers
    window.location.href = this.authService.getGoogleLoginUrl();
  }

  loginWithGooglePopup(): void {
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

  startPlanning(destName?: string): void {
    // If we have a full DestinationOption selected from autocomplete, use it
    const selected = this.selectedHeroDest();
    if (selected) {
      localStorage.setItem('travelyx_hero_dest', JSON.stringify(selected));
    } else if (destName) {
      // Quick chip — save just the name, public-wizard will handle it
      localStorage.setItem('travelyx_hero_dest', JSON.stringify({ name: destName, label: destName }));
    }
    this.router.navigate(['/planejar']);
  }

  displayHeroDest = (dest: DestinationOption | string): string => {
    if (!dest) return '';
    if (typeof dest === 'string') return dest;
    return dest.label || dest.name;
  };

  onHeroDestSelected(dest: DestinationOption): void {
    this.selectedHeroDest.set(dest);
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
