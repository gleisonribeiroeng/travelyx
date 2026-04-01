import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { FlightApiService, AirportOption } from '../../core/api/flight-api.service';
import { HotelApiService, DestinationOption } from '../../core/api/hotel-api.service';
import { AuthService } from '../../core/services/auth.service';
import { Observable, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError } from 'rxjs/operators';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DynamicCurrencyPipe } from '../../core/i18n/dynamic-currency.pipe';
import { TourApiService } from '../../core/api/tour-api.service';
import { SeoService } from '../../core/services/seo.service';
import { DESTINATION_DB } from '../../core/data/destinations.data';

interface WizardResult {
  flights: { origin: string; destination: string; price: number; airline: string; departure: string; duration: string }[];
  hotels: { name: string; pricePerNight: number; nights: number; total: number; rating: number; photo?: string }[];
  activities: { name: string; price: number; photo?: string; duration?: string; rating?: number }[];
  totalCost: number;
  savings: number;
}

@Component({
  selector: 'app-public-wizard',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, ReactiveFormsModule, DynamicCurrencyPipe],
  templateUrl: './public-wizard.component.html',
  styleUrl: './public-wizard.component.scss',
})
export class PublicWizardComponent implements OnInit {
  private readonly flightApi = inject(FlightApiService);
  private readonly hotelApi = inject(HotelApiService);
  private readonly tourApi = inject(TourApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  // Wizard state
  readonly currentStep = signal(0);
  readonly totalSteps = 5;
  readonly progress = computed(() => ((this.currentStep() + 1) / this.totalSteps) * 100);

  // Step 1: Destination
  readonly destinationControl = new FormControl('');
  readonly originControl = new FormControl('');
  filteredDestinations$!: Observable<DestinationOption[]>;
  filteredOrigins$!: Observable<AirportOption[]>;
  selectedDestination = signal<DestinationOption | null>(null);
  selectedOrigin = signal<AirportOption | null>(null);

  // Step 2: Dates
  departureDate = signal('');
  returnDate = signal('');
  flexibleDates = signal(false);

  // Step 3: Travelers
  adults = signal(2);
  hasChildren = signal(false);
  children = signal(0);

  // Step 4: Categories
  includeFlights = signal(true);
  includeHotels = signal(true);
  includeCar = signal(false);
  includeActivities = signal(false);

  // Step 5: Results
  isSearching = signal(false);
  hasResults = signal(false);
  result = signal<WizardResult | null>(null);

  // Rotating loading text
  readonly loadingPhase = signal(0);
  private loadingInterval: any;

  readonly loadingTexts = [
    'Buscando voos... ✈️',
    'Comparando hotéis... 🏨',
    'Descobrindo atividades incríveis... 🎯',
  ];

  readonly loadingTips: Record<string, string[]> = {
    'Paris': ['Sabia que Paris recebe 30 milhões de turistas por ano?', 'Dica: a melhor vista da Torre Eiffel é do Trocadéro!', 'O metrô de Paris cobre toda a cidade — você não precisa de carro.'],
    'Lisboa': ['Lisboa é a capital mais antiga da Europa Ocidental!', 'Dica: o Elétrico 28 é um passeio imperdível.', 'A Lisboa Card dá acesso ao metrô + atrações ilimitadas.'],
    'Rio de Janeiro': ['O Rio recebe mais de 2 milhões de turistas por ano!', 'Dica: suba o Pão de Açúcar no fim da tarde para o pôr do sol.', 'O metrô do Rio te leva de Copacabana ao Centro em 20 min.'],
    'Orlando': ['Orlando tem mais de 12 parques temáticos!', 'Dica: compre ingressos antecipados — são muito mais baratos.', 'Alugue carro em Orlando — transporte público é limitado.'],
    'Buenos Aires': ['Buenos Aires é conhecida como a Paris da América do Sul.', 'Dica: visite o bairro de La Boca para ver as casas coloridas.', 'O subte (metrô) de Buenos Aires é o mais antigo da América Latina.'],
    'default': ['Comparando preços de centenas de fontes...', 'Buscando as melhores ofertas para você...', 'Quase pronto! Montando seu roteiro...'],
  };

  readonly loadingText = computed(() => this.loadingTexts[this.loadingPhase() % this.loadingTexts.length]);

  readonly loadingTip = computed(() => {
    const dest = this.selectedDestination()?.name?.split(',')[0] || '';
    const tips = this.loadingTips[dest] || this.loadingTips['default'];
    return tips[this.loadingPhase() % tips.length];
  });

  /** Photo URL for the destination result header */
  readonly destinationPhotoUrl = computed(() => {
    const dest = this.selectedDestination()?.name?.split(',')[0]?.trim()?.toLowerCase() || '';
    const photos: Record<string, string> = {
      'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
      'rio de janeiro': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
      'lisboa': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80',
      'orlando': 'https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=800&q=80',
      'buenos aires': 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80',
      'santiago': 'https://images.unsplash.com/photo-1569272031118-b78017f20a75?w=800&q=80',
      'gramado': 'https://images.unsplash.com/photo-1609942571893-c87dde449c5e?w=800&q=80',
    };
    for (const [key, url] of Object.entries(photos)) {
      if (dest.includes(key)) return url;
    }
    return '';
  });

  /** Climate info for the destination */
  readonly destinationClimate = computed(() => {
    const dest = this.selectedDestination()?.name || '';
    const depDate = this.departureDate();
    if (!depDate) return '';
    const month = new Date(depDate + 'T00:00:00').getMonth() + 1;
    for (const [country, meta] of Object.entries(DESTINATION_DB)) {
      if (dest.toLowerCase().includes(country.toLowerCase())) {
        const temp = meta.avgTempByMonth[month];
        const season = meta.highSeasonMonths.includes(month) ? 'Alta temporada' : 'Baixa temporada';
        return `☀️ ${temp}°C · ${season}`;
      }
    }
    return '';
  });

  /** Detailed climate tip for dates step */
  readonly climateTipText = computed(() => {
    const dest = this.selectedDestination()?.name?.split(',')[0] || '';
    const depDate = this.departureDate();
    if (!depDate) return '';
    const month = new Date(depDate + 'T00:00:00').getMonth() + 1;
    const monthNames = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    for (const [country, meta] of Object.entries(DESTINATION_DB)) {
      if (dest.toLowerCase().includes(country.toLowerCase())) {
        const temp = meta.avgTempByMonth[month];
        const isHigh = meta.highSeasonMonths.includes(month);
        return `${dest} em ${monthNames[month]}: ${temp}°C em média. ${isHigh ? '⚠️ Alta temporada — reserve com antecedência!' : '✅ Baixa temporada — boa época para visitar!'}`;
      }
    }
    return '';
  });

  // Style preferences (Step 4)
  readonly accommodationStyle = signal<string>('');
  readonly accommodationTypes = [
    { id: 'hotel_comfort', emoji: '🏨', label: 'Hotel confortável' },
    { id: 'hotel_budget', emoji: '🛏️', label: 'Econômico e bem localizado' },
    { id: 'hostel', emoji: '🎒', label: 'Hostel / Mochilão' },
    { id: 'apartment', emoji: '🏠', label: 'Apartamento' },
  ];

  readonly explorationStyle = signal<string>('');
  readonly explorationStyles = [
    { id: 'free', emoji: '🗺️', label: 'Explorar livremente' },
    { id: 'guided', emoji: '🎧', label: 'Passeios guiados' },
    { id: 'food', emoji: '🍷', label: 'Foco em gastronomia' },
    { id: 'adventure', emoji: '🧗', label: 'Aventura e natureza' },
  ];

  // Trip type
  readonly tripType = signal<string>('couple');
  readonly tripTypes = [
    { value: 'solo', icon: '👤', label: 'Solo' },
    { value: 'couple', icon: '💑', label: 'Casal' },
    { value: 'family', icon: '👨‍👩‍👧', label: 'Família' },
    { value: 'friends', icon: '👥', label: 'Amigos' },
    { value: 'business', icon: '💼', label: 'Trabalho' },
  ];

  // Popular destinations for quick pick
  readonly popularDestinations = [
    { city: 'Rio de Janeiro', country: 'Brasil', emoji: '🏖️', destId: '-666435', searchType: 'CITY', photo: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&q=75' },
    { city: 'Paris', country: 'França', emoji: '🗼', destId: '-1456928', searchType: 'CITY', photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=75' },
    { city: 'Lisboa', country: 'Portugal', emoji: '🏛️', destId: '-2167973', searchType: 'CITY', photo: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&q=75' },
    { city: 'Buenos Aires', country: 'Argentina', emoji: '💃', destId: '-979186', searchType: 'CITY', photo: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=400&q=75' },
    { city: 'Orlando', country: 'EUA', emoji: '🎢', destId: '-2092174', searchType: 'CITY', photo: 'https://images.unsplash.com/photo-1575931953324-fcac7094999e?w=400&q=75' },
    { city: 'Santiago', country: 'Chile', emoji: '🏔️', destId: '-1279579', searchType: 'CITY', photo: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=400&q=75' },
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Planeje sua Viagem Grátis - Travelyx',
      description: 'Monte seu roteiro de viagem completo em minutos: voos, hotéis, passeios e atividades. Planejamento gratuito no Travelyx.',
      url: 'https://travelyx.com.br/planejar',
      keywords: 'planejar viagem, roteiro de viagem, planejamento gratuito, voos, hotéis, passeios, travelyx',
    });
    this.filteredDestinations$ = this.destinationControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => {
        if (!val || typeof val !== 'string' || val.length < 2) return of([]);
        return this.hotelApi.searchDestinations(val).pipe(catchError(() => of([])));
      })
    );

    this.filteredOrigins$ = this.originControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => {
        if (!val || typeof val !== 'string' || val.length < 2) return of([]);
        return this.flightApi.searchAirports(val).pipe(catchError(() => of([])));
      })
    );

    // Set default dates (2 weeks from now, 7 day trip)
    const start = new Date();
    start.setDate(start.getDate() + 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    this.departureDate.set(this.formatDate(start));
    this.returnDate.set(this.formatDate(end));

    // Load destination from landing page hero search
    try {
      const saved = localStorage.getItem('travelyx_hero_dest');
      if (saved) {
        const dest = JSON.parse(saved);
        if (dest.destId) {
          // Full DestinationOption from autocomplete
          this.selectedDestination.set(dest);
          this.destinationControl.setValue(dest.label || dest.name);
        } else if (dest.name) {
          // Quick chip — just a name, pre-fill the input
          this.destinationControl.setValue(dest.name);
          // Try to search and auto-select the first result
          this.hotelApi.searchDestinations(dest.name).pipe(
            catchError(() => of([]))
          ).subscribe(results => {
            if (results.length > 0) {
              this.selectedDestination.set(results[0]);
              this.destinationControl.setValue(results[0].label || results[0].name);
            }
          });
        }
        localStorage.removeItem('travelyx_hero_dest');
      }
    } catch {}
  }

  // Navigation
  next(): void {
    if (this.currentStep() < this.totalSteps - 1) {
      if (this.currentStep() === 3) {
        // Step 4 -> search and show results
        this.searchAndShowResults();
      }
      this.currentStep.update(s => s + 1);
    }
  }

  back(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 0: return !!this.selectedDestination();
      case 1: return this.flexibleDates() || (!!this.departureDate() && !!this.returnDate());
      case 2: return this.adults() >= 1;
      case 3: return this.includeFlights() || this.includeHotels();
      default: return true;
    }
  }

  // Step 1: Destination selection
  selectPopularDestination(dest: typeof this.popularDestinations[0]): void {
    this.selectedDestination.set({
      destId: dest.destId,
      name: dest.city,
      label: `${dest.city}, ${dest.country}`,
      searchType: dest.searchType as any,
    });
    this.destinationControl.setValue(dest.city);
  }

  onDestinationSelected(dest: DestinationOption): void {
    this.selectedDestination.set(dest);
  }

  onOriginSelected(airport: AirportOption): void {
    this.selectedOrigin.set(airport);
  }

  displayDestination = (dest: DestinationOption | string): string => {
    if (!dest) return '';
    if (typeof dest === 'string') return dest;
    return dest.label || dest.name;
  };

  displayAirport = (airport: AirportOption | string): string => {
    if (!airport) return '';
    if (typeof airport === 'string') return airport;
    return airport.iataCode ? `${airport.cityName} (${airport.iataCode})` : airport.cityName;
  };

  // Step 3: Travelers
  setAdults(n: number): void { this.adults.set(n); }

  // Search
  searchAndShowResults(): void {
    this.isSearching.set(true);
    this.hasResults.set(false);
    this.loadingPhase.set(0);
    this.loadingInterval = setInterval(() => this.loadingPhase.update(p => p + 1), 3000);

    const dest = this.selectedDestination();
    if (!dest) return;

    const tasks: Observable<any>[] = [];

    // Search hotels
    if (this.includeHotels()) {
      const hotelParams = {
        destId: dest.destId,
        searchType: dest.searchType || 'CITY',
        checkIn: this.departureDate() || this.getDefaultDate(14),
        checkOut: this.returnDate() || this.getDefaultDate(21),
        adults: this.adults(),
        rooms: 1,
      };
      tasks.push(
        this.hotelApi.searchHotels(hotelParams).pipe(
          map(res => ({ type: 'hotels' as const, data: res.data?.slice(0, 3) || [] })),
          catchError(() => of({ type: 'hotels' as const, data: [] }))
        )
      );
    }

    // Search flights — first resolve destination airport, then search
    if (this.includeFlights()) {
      const origin = this.selectedOrigin();
      const originCode = origin?.iataCode || 'GRU';
      const destName = (dest.name || dest.label || '').split(',')[0].trim();

      tasks.push(
        this.flightApi.searchAirports(destName).pipe(
          switchMap(airports => {
            const destAirport = airports.find(a => a.iataCode) || airports[0];
            if (!destAirport?.iataCode) {
              return of({ type: 'flights' as const, data: [] });
            }
            const flightParams = {
              origin: originCode,
              destination: destAirport.iataCode,
              departureDate: this.departureDate() || this.getDefaultDate(14),
              returnDate: this.returnDate() || this.getDefaultDate(21),
              adults: this.adults(),
            };
            return this.flightApi.searchFlights(flightParams).pipe(
              map(res => ({ type: 'flights' as const, data: res.data?.slice(0, 3) || [] })),
              catchError(() => of({ type: 'flights' as const, data: [] }))
            );
          }),
          catchError(() => of({ type: 'flights' as const, data: [] }))
        )
      );
    }

    // Search activities
    if (this.includeActivities() || true) {
      // Always search activities to show value
      tasks.push(
        this.tourApi.searchTours({ destination: dest.name || dest.label || '' }, 0, 5).pipe(
          map(res => ({ type: 'activities' as const, data: res.data?.slice(0, 5) || [] })),
          catchError(() => of({ type: 'activities' as const, data: [] }))
        )
      );
    }

    if (tasks.length === 0) {
      this.generateMockResult();
      return;
    }

    forkJoin(tasks).subscribe({
      next: (results) => {
        const flightResult = results.find((r: any) => r.type === 'flights');
        const hotelResult = results.find((r: any) => r.type === 'hotels');
        const activityResult = results.find((r: any) => r.type === 'activities');

        const flights = (flightResult?.data || []).map((f: any) => ({
          origin: f.origin || 'GRU',
          destination: f.destination || dest!.name,
          price: f.price?.total || 0,
          airline: f.airline || 'Companhia Aérea',
          departure: f.departureDate || this.departureDate(),
          duration: f.durationMinutes ? `${Math.floor(f.durationMinutes / 60)}h ${f.durationMinutes % 60}m` : '2h 30m',
        }));

        const nights = this.calculateNights();
        const hotels = (hotelResult?.data || []).map((h: any) => ({
          name: h.name || 'Hotel',
          pricePerNight: h.pricePerNight?.total || h.price?.total || 0,
          nights,
          total: (h.pricePerNight?.total || h.price?.total || 0) * nights,
          rating: h.rating || h.stars || 4,
          photo: h.photoUrl || h.photo || '',
        }));

        const activities = (activityResult?.data || []).slice(0, 5).map((a: any) => ({
          name: a.name || 'Atividade',
          price: a.price?.total || 0,
          photo: a.images?.[0] || a.photoUrl || a.photo || '',
          duration: a.durationMinutes ? `${Math.floor(a.durationMinutes / 60)}h` : '',
          rating: a.rating || 0,
        }));

        const bestFlight = flights[0];
        const bestHotel = hotels[0];
        const flightCost = bestFlight?.price || 0;
        const hotelCost = bestHotel?.total || 0;
        const activityCost = activities.reduce((sum: number, a: any) => sum + (a.price || 0), 0);
        const totalCost = (flightCost * this.adults()) + hotelCost + activityCost;
        const savings = Math.round(totalCost * 0.28);

        this.result.set({
          flights: flights.length > 0 ? [flights[0]] : [],
          hotels: hotels.length > 0 ? [hotels[0]] : [],
          activities,
          totalCost,
          savings,
        });
        this.hasResults.set(true);
        this.isSearching.set(false);
        clearInterval(this.loadingInterval);
      },
      error: () => {
        this.generateMockResult();
      }
    });
  }

  private generateMockResult(): void {
    const dest = this.selectedDestination();
    const nights = this.calculateNights();
    const destName = dest?.name || 'Destino';
    this.result.set({
      flights: [{ origin: 'GRU', destination: destName, price: 890, airline: 'Companhia Aérea', departure: this.departureDate(), duration: '3h 20m' }],
      hotels: [{ name: `Hotel em ${destName}`, pricePerNight: 320, nights, total: 320 * nights, rating: 4.2, photo: '' }],
      activities: [
        { name: `City Tour ${destName}`, price: 120, duration: '3h', rating: 4.8 },
        { name: `Passeio de barco`, price: 180, duration: '4h', rating: 4.6 },
        { name: `Tour gastronômico`, price: 95, duration: '2h', rating: 4.9 },
      ],
      totalCost: 890 * this.adults() + 320 * nights + 395,
      savings: Math.round((890 * this.adults() + 320 * nights + 395) * 0.28),
    });
    this.hasResults.set(true);
    this.isSearching.set(false);
  }

  loginWithGoogle(): void {
    // Save wizard state to localStorage before redirecting
    const state = {
      destination: this.selectedDestination(),
      origin: this.selectedOrigin(),
      departureDate: this.departureDate(),
      returnDate: this.returnDate(),
      adults: this.adults(),
      tripType: this.tripType(),
      result: this.result(),
    };
    localStorage.setItem('travelyx_public_wizard', JSON.stringify(state));
    window.location.href = this.authService.getGoogleLoginUrl();
  }

  /** Format rating to 1 decimal place */
  formatRating(rating: number | undefined): string {
    if (!rating || isNaN(rating)) return '—';
    return (Math.round(rating * 10) / 10).toFixed(1);
  }

  // Helpers
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getDefaultDate(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return this.formatDate(d);
  }

  private calculateNights(): number {
    if (!this.departureDate() || !this.returnDate()) return 7;
    const start = new Date(this.departureDate());
    const end = new Date(this.returnDate());
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  get stepLabels(): string[] {
    return ['Destino', 'Datas', 'Viajantes', 'Categorias', 'Resultado'];
  }
}
