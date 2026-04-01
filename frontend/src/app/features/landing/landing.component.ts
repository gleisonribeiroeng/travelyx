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
    {
      city: 'Orlando',
      tag: 'FAMÍLIA',
      flightFrom: 2100,
      image: 'https://images.unsplash.com/photo-1575931953324-fcac7094999e?w=800&q=80',
    },
    {
      city: 'Gramado',
      tag: 'INVERNO',
      flightFrom: 380,
      image: 'https://images.unsplash.com/photo-1605889066637-b9e83bbea0da?w=800&q=80',
    },
    {
      city: 'Buenos Aires',
      tag: 'CULTURAL',
      flightFrom: 650,
      image: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80',
    },
  ];

  readonly destinations = signal<FeaturedDestination[]>(this.fallbackDestinations);
  readonly stats = signal({ destinations: 0, tripsPlanned: 0, reviews: 0 });
  readonly loading = signal(false);

  // Hero rotating photos
  readonly heroPhotos = [
    { city: 'Paris', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80' },
    { city: 'Rio de Janeiro', url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1920&q=80' },
    { city: 'Lisboa', url: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1920&q=80' },
  ];
  readonly heroPhotoIndex = signal(0);

  // Testimonials
  readonly testimonials = [
    { name: 'Marina S.', text: 'Planejei minha lua de mel pra Portugal inteira no Travelyx. Antes eu tinha 15 abas abertas e uma planilha que ficou tão complicada que desisti três vezes. Aqui montei tudo em uma tarde.', trip: 'Lisboa e Porto · 10 dias', photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face' },
    { name: 'Ricardo M.', text: 'O alerta de preço me salvou R$ 800 no voo pra Orlando. Eu tinha setado o preço-alvo e esqueci. Duas semanas depois recebi o aviso que caiu. Comprei na hora.', trip: 'Orlando · 7 dias em família', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face' },
    { name: 'Camila L.', text: 'Éramos 4 amigos planejando Gramado e ninguém concordava em nada. No Travelyx cada um adicionou o que queria e votamos nas opções. Ficou muito mais fácil.', trip: 'Gramado · 5 dias com amigos', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
  ];

  // FAQs
  readonly faqs = [
    { q: 'O Travelyx é realmente grátis?', a: 'Sim, 100% grátis. Sem período de teste, sem cartão de crédito, sem cobranças escondidas. O plano básico inclui tudo que você precisa para planejar uma viagem completa.' },
    { q: 'Vocês vendem meus dados?', a: 'Não. Usamos login via Google para facilitar o acesso. Não temos acesso à sua senha e não vendemos dados para terceiros.' },
    { q: 'Como o Travelyx ganha dinheiro se é grátis?', a: 'Somos uma startup em fase inicial e o produto é 100% gratuito. No futuro, teremos planos premium opcionais — mas o plano básico continuará grátis para sempre.' },
    { q: 'Posso planejar com outras pessoas?', a: 'Sim! Convide amigos e familiares por email. Todo mundo edita o roteiro em tempo real, vota em opções e divide gastos.' },
    { q: 'Preciso comprar voos e hotéis pelo Travelyx?', a: 'Não. O Travelyx mostra preços de diversas fontes (Booking, Kiwi, Travelpayouts) mas você compra direto no site oficial. Não somos uma agência — somos uma ferramenta de planejamento.' },
    { q: 'E se eu não souber as datas exatas da viagem?', a: 'Sem problema! Você pode criar um roteiro sem datas e ajustar depois. O app funciona mesmo sem datas definidas.' },
    { q: 'Funciona no celular?', a: 'Sim. O Travelyx é responsivo e funciona em qualquer navegador. No dia da viagem, o "Modo Viagem" mostra tudo que você precisa na palma da mão.' },
    { q: 'Consigo exportar meu roteiro?', a: 'Sim! Gere um PDF profissional, exporte para Excel, sincronize com o Google Calendar ou compartilhe um link público.' },
  ];

  // Hero device carousel
  readonly screens = ['hotels', 'checklist', 'timeline'];
  readonly activeScreen = signal(0);
  private screenTimer?: ReturnType<typeof setInterval>;
  private photoTimer?: ReturnType<typeof setInterval>;

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

    // Rotate hero background photos
    this.photoTimer = setInterval(() => this.heroPhotoIndex.update(i => (i + 1) % this.heroPhotos.length), 6000);

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
    if (this.photoTimer) clearInterval(this.photoTimer);
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
