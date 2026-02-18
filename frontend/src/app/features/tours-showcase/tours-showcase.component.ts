import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { AuthService } from '../../core/services/auth.service';
import {
  TourShowcaseApiService,
  ShowcaseTour,
} from '../../core/api/tour-showcase-api.service';
import { categorizeTours, CategorizedTours } from '../../core/utils/tour-categorizer.util';

@Component({
  selector: 'app-tours-showcase',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, CurrencyPipe],
  templateUrl: './tours-showcase.component.html',
  styleUrl: './tours-showcase.component.scss',
})
export class ToursShowcaseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(TourShowcaseApiService);
  readonly authService = inject(AuthService);

  readonly mostBooked = signal<ShowcaseTour[]>([]);
  readonly mustDo = signal<ShowcaseTour[]>([]);
  readonly unique = signal<ShowcaseTour[]>([]);
  readonly loading = signal(true);
  readonly highlights = signal<CategorizedTours<ShowcaseTour>>({
    cheapest: null, bestRated: null, bestValue: null, all: [],
  });

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
      },
      error: () => this.loading.set(false),
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  loginWithGoogle(): void {
    window.location.href = this.authService.getGoogleLoginUrl();
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
}
