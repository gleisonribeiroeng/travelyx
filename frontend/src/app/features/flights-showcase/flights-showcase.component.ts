import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  ElementRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { AuthService } from '../../core/services/auth.service';
import {
  FlightShowcaseApiService,
  ShowcaseFlight,
} from '../../core/api/flight-showcase-api.service';
import {
  categorizeFlights,
  CategorizedFlights,
} from '../../core/utils/flight-categorizer.util';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { ListItemConfig, ListItemTag } from '../../shared/components/list-item-base/list-item-base.model';

@Component({
  selector: 'app-flights-showcase',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, CurrencyPipe, DatePipe, ListItemBaseComponent],
  templateUrl: './flights-showcase.component.html',
  styleUrl: './flights-showcase.component.scss',
})
export class FlightsShowcaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(FlightShowcaseApiService);
  private readonly el = inject(ElementRef);
  readonly authService = inject(AuthService);

  readonly deals = signal<ShowcaseFlight[]>([]);
  readonly popular = signal<ShowcaseFlight[]>([]);
  readonly recommended = signal<ShowcaseFlight[]>([]);
  readonly loading = signal(true);
  readonly highlights = signal<CategorizedFlights<ShowcaseFlight>>({
    cheapest: null, fastest: null, bestValue: null, all: [],
  });

  private observer!: IntersectionObserver;

  ngOnInit(): void {
    this.api.getShowcase().subscribe({
      next: (res) => {
        this.deals.set(res.deals);
        this.popular.set(res.popular);
        this.recommended.set(res.recommended);

        const allFlights = [...res.deals, ...res.popular, ...res.recommended];
        const seen = new Set<string>();
        const unique = allFlights.filter(f => {
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        });
        this.highlights.set(categorizeFlights(unique));

        this.loading.set(false);

        setTimeout(() => {
          (this.el.nativeElement as HTMLElement)
            .querySelectorAll('.reveal:not(.revealed)')
            .forEach((el) => this.observer.observe(el));
        });
      },
      error: () => this.loading.set(false),
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
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  loginWithGoogle(): void {
    window.location.href = this.authService.getGoogleLoginUrl();
  }

  scrollToSection(id: string): void {
    (this.el.nativeElement as HTMLElement)
      .querySelector(`#${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  formatTime(isoDatetime: string): string {
    const d = new Date(isoDatetime);
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  toListItem(flight: ShowcaseFlight, tag?: 'cheapest' | 'fastest' | 'bestValue' | null): ListItemConfig {
    const tags: ListItemTag[] = [];
    if (tag === 'bestValue') tags.push({ label: 'Melhor custo-beneficio', variant: 'value' });
    if (tag === 'cheapest') tags.push({ label: 'Mais barato', variant: 'cheap' });
    if (tag === 'fastest') tags.push({ label: 'Mais rapido', variant: 'fast' });

    const depTime = flight.departureAt.split('T')[1]?.substring(0, 5) ?? '';
    const arrTime = flight.arrivalAt.split('T')[1]?.substring(0, 5) ?? '';
    const stopsText = flight.stops === 0 ? 'Direto' : `${flight.stops} parada${flight.stops > 1 ? 's' : ''}`;

    const images = flight.destinationImage ? [flight.destinationImage] : [];

    return {
      id: flight.id,
      images,
      placeholderIcon: 'flight',
      title: `${flight.origin} → ${flight.destination}`,
      infoLines: [
        { icon: 'airlines', text: `${flight.airline} ${flight.flightNumber}` },
        { icon: 'schedule', text: `${depTime} — ${arrTime} (${this.formatDuration(flight.durationMinutes)})` },
        { icon: 'connecting_airports', text: stopsText },
      ],
      price: {
        amount: flight.price.total,
        currency: flight.price.currency,
      },
      primaryAction: { type: 'view', label: 'Ver voos', icon: 'search' },
      tags,
      isAdded: false,
      isRecommended: !!tag,
    };
  }

  onCardClick(_id: string): void {
    this.navigateTo('/search');
  }

  onPrimaryClick(_id: string): void {
    this.navigateTo('/search');
  }
}
