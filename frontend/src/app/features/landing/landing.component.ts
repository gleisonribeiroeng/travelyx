import { Component, OnDestroy, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { AuthService } from '../../core/services/auth.service';
import {
  HomeShowcaseApiService,
  FeaturedDestination,
  DealFlight,
  DealHotel,
  PopularTour,
} from '../../core/api/home-showcase-api.service';

interface Slide {
  image: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [MATERIAL_IMPORTS, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(HomeShowcaseApiService);
  readonly authService = inject(AuthService);

  readonly slides: Slide[] = [
    {
      image: 'assets/pexels-mikhail-nilov-8430372.jpg',
      title: 'Tudo o que você precisa para viajar, no mesmo lugar!',
      subtitle: 'Passagens, hospedagem, passeios e roteiros — planeje sua viagem completa com a Travelyx.',
    },
    {
      image: 'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg?auto=compress&cs=tinysrgb&w=1920',
      title: 'Descubra destinos incríveis ao redor do mundo',
      subtitle: 'De praias paradisíacas a cidades históricas — encontre o destino perfeito para você.',
    },
    {
      image: 'https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&cs=tinysrgb&w=1920',
      title: 'Monte seu roteiro personalizado dia a dia',
      subtitle: 'Organize voos, hotéis, passeios e transportes em um calendário visual e intuitivo.',
    },
  ];

  readonly currentSlide = signal(0);
  private intervalId: ReturnType<typeof setInterval>;

  // Showcase data
  readonly destinations = signal<FeaturedDestination[]>([]);
  readonly dealFlights = signal<DealFlight[]>([]);
  readonly dealHotels = signal<DealHotel[]>([]);
  readonly topHotels = signal<DealHotel[]>([]);
  readonly popularTours = signal<PopularTour[]>([]);
  readonly stats = signal({ destinations: 0, tripsPlanned: 0, reviews: 0 });
  readonly loading = signal(true);
  readonly activeDealsTab = signal<'flights' | 'hotels'>('flights');

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
    this.intervalId = setInterval(() => this.next(), 5000);
  }

  ngOnInit(): void {
    this.api.getShowcase().subscribe({
      next: (res) => {
        this.destinations.set(res.destinations);
        this.dealFlights.set(res.dealFlights);
        this.dealHotels.set(res.dealHotels);
        this.topHotels.set(res.topHotels);
        this.popularTours.set(res.popularTours);
        this.stats.set(res.stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  next(): void {
    this.currentSlide.set((this.currentSlide() + 1) % this.slides.length);
  }

  prev(): void {
    this.currentSlide.set(
      (this.currentSlide() - 1 + this.slides.length) % this.slides.length
    );
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.next(), 5000);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  loginWithGoogle(): void {
    window.location.href = this.authService.getGoogleLoginUrl();
  }

  setDealsTab(tab: 'flights' | 'hotels'): void {
    this.activeDealsTab.set(tab);
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  formatStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }
}
