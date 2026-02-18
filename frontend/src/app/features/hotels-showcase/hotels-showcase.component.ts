import { Component, inject, signal, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-hotels-showcase',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, CurrencyPipe],
  templateUrl: './hotels-showcase.component.html',
  styleUrl: './hotels-showcase.component.scss',
})
export class HotelsShowcaseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(HotelShowcaseApiService);
  readonly authService = inject(AuthService);

  readonly bestPrices = signal<ShowcaseHotel[]>([]);
  readonly topRated = signal<ShowcaseHotel[]>([]);
  readonly unique = signal<ShowcaseHotel[]>([]);
  readonly loading = signal(true);
  readonly highlights = signal<CategorizedHotels<ShowcaseHotel>>({
    cheapest: null, bestRated: null, bestValue: null, all: [],
  });

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

  formatStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }
}
