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
import { CurrencyPipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { AuthService } from '../../core/services/auth.service';
import {
  HotelShowcaseApiService,
  ShowcaseHotel,
} from '../../core/api/hotel-showcase-api.service';
import {
  categorizeHotels,
  CategorizedHotels,
} from '../../core/utils/hotel-categorizer.util';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { ListItemConfig, ListItemTag } from '../../shared/components/list-item-base/list-item-base.model';

@Component({
  selector: 'app-hotels-showcase',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, CurrencyPipe, ListItemBaseComponent],
  templateUrl: './hotels-showcase.component.html',
  styleUrl: './hotels-showcase.component.scss',
})
export class HotelsShowcaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(HotelShowcaseApiService);
  private readonly el = inject(ElementRef);
  readonly authService = inject(AuthService);

  readonly bestPrices = signal<ShowcaseHotel[]>([]);
  readonly topRated = signal<ShowcaseHotel[]>([]);
  readonly unique = signal<ShowcaseHotel[]>([]);
  readonly loading = signal(true);
  readonly highlights = signal<CategorizedHotels<ShowcaseHotel>>({
    cheapest: null, bestRated: null, bestValue: null, all: [],
  });

  private observer!: IntersectionObserver;

  ngOnInit(): void {
    this.api.getShowcase().subscribe({
      next: (res) => {
        this.bestPrices.set(res.bestPrices);
        this.topRated.set(res.topRated);
        this.unique.set(res.unique);

        const allHotels = [...res.bestPrices, ...res.topRated, ...res.unique];
        const seen = new Set<string>();
        const uniqueHotels = allHotels.filter(h => {
          if (seen.has(h.id)) return false;
          seen.add(h.id);
          return true;
        });
        this.highlights.set(categorizeHotels(uniqueHotels));

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

  toListItem(hotel: ShowcaseHotel, tag?: 'cheapest' | 'bestRated' | 'bestValue' | null): ListItemConfig {
    const tags: ListItemTag[] = [];
    if (tag === 'bestValue') tags.push({ label: 'Melhor custo-beneficio', variant: 'value' });
    if (tag === 'cheapest') tags.push({ label: 'Melhor preco', variant: 'cheap' });
    if (tag === 'bestRated') tags.push({ label: 'Mais bem avaliado', variant: 'rated' });

    const images = hotel.photoUrl ? [hotel.photoUrl] : [];
    if (hotel.cityImage && !images.includes(hotel.cityImage)) {
      images.unshift(hotel.cityImage);
    }

    return {
      id: hotel.id,
      images,
      placeholderIcon: 'hotel',
      title: hotel.name,
      infoLines: [
        { icon: 'location_on', text: hotel.city },
        { icon: 'apartment', text: hotel.type },
      ],
      rating: { value: hotel.rating, reviewCount: hotel.reviewCount },
      price: {
        amount: hotel.pricePerNight.total,
        currency: hotel.pricePerNight.currency,
        label: '/noite',
      },
      primaryAction: { type: 'view', label: 'Ver hoteis', icon: 'search' },
      tags,
      isAdded: false,
      isRecommended: !!tag,
    };
  }

  onCardClick(_id: string): void {
    this.navigateTo('/hotels');
  }

  onPrimaryClick(_id: string): void {
    this.navigateTo('/hotels');
  }
}
