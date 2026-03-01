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
  TourShowcaseApiService,
  ShowcaseTour,
} from '../../core/api/tour-showcase-api.service';
import { categorizeTours, CategorizedTours } from '../../core/utils/tour-categorizer.util';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { ListItemConfig, ListItemInfoLine, ListItemTag } from '../../shared/components/list-item-base/list-item-base.model';

@Component({
  selector: 'app-tours-showcase',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, CurrencyPipe, ListItemBaseComponent],
  templateUrl: './tours-showcase.component.html',
  styleUrl: './tours-showcase.component.scss',
})
export class ToursShowcaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(TourShowcaseApiService);
  private readonly el = inject(ElementRef);
  readonly authService = inject(AuthService);

  readonly mostBooked = signal<ShowcaseTour[]>([]);
  readonly mustDo = signal<ShowcaseTour[]>([]);
  readonly unique = signal<ShowcaseTour[]>([]);
  readonly loading = signal(true);
  readonly highlights = signal<CategorizedTours<ShowcaseTour>>({
    cheapest: null, bestRated: null, bestValue: null, all: [],
  });

  private observer!: IntersectionObserver;

  ngOnInit(): void {
    this.api.getShowcase().subscribe({
      next: (res) => {
        this.mostBooked.set(res.mostBooked);
        this.mustDo.set(res.mustDo);
        this.unique.set(res.unique);

        const allTours = [...res.mostBooked, ...res.mustDo, ...res.unique];
        const seen = new Set<string>();
        const uniqueTours = allTours.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        this.highlights.set(categorizeTours(uniqueTours));

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

  private formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  toListItem(tour: ShowcaseTour, tag?: 'cheapest' | 'bestRated' | 'bestValue' | null): ListItemConfig {
    const tags: ListItemTag[] = [];
    if (tag === 'bestValue') tags.push({ label: 'Melhor custo-beneficio', variant: 'value' });
    if (tag === 'cheapest') tags.push({ label: 'Melhor preco', variant: 'cheap' });
    if (tag === 'bestRated') tags.push({ label: 'Mais bem avaliado', variant: 'rated' });

    const images = tour.images?.length ? [...tour.images] : [];
    if (tour.cityImage && !images.includes(tour.cityImage)) {
      images.unshift(tour.cityImage);
    }

    const infoLines: ListItemInfoLine[] = [
      { icon: 'location_on', text: tour.city },
    ];
    if (tour.durationMinutes) {
      infoLines.push({ icon: 'schedule', text: this.formatDuration(tour.durationMinutes) });
    }

    return {
      id: tour.id,
      images,
      placeholderIcon: 'tour',
      title: tour.name,
      infoLines,
      rating: { value: tour.rating, reviewCount: tour.reviewCount },
      description: tour.description?.length > 120
        ? tour.description.substring(0, 120) + '...'
        : tour.description,
      price: {
        amount: tour.price.total,
        currency: tour.price.currency,
        label: '/pessoa',
      },
      primaryAction: { type: 'view', label: 'Ver passeios', icon: 'search' },
      tags,
      isAdded: false,
      isRecommended: !!tag,
    };
  }

  onCardClick(_id: string): void {
    this.navigateTo('/tours');
  }

  onPrimaryClick(_id: string): void {
    this.navigateTo('/tours');
  }
}
