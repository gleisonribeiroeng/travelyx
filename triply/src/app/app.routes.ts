import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent),
  },
  {
    path: 'voos',
    loadComponent: () =>
      import('./features/flights-showcase/flights-showcase.component').then(m => m.FlightsShowcaseComponent),
  },
  {
    path: 'hoteis',
    loadComponent: () =>
      import('./features/hotels-showcase/hotels-showcase.component').then(m => m.HotelsShowcaseComponent),
  },
  {
    path: 'passeios',
    loadComponent: () =>
      import('./features/tours-showcase/tours-showcase.component').then(m => m.ToursShowcaseComponent),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'planner',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/trip-wizard/trip-wizard.component').then(m => m.TripWizardComponent),
    children: [
      { path: '', redirectTo: 'flights', pathMatch: 'full' as const },
      {
        path: 'flights',
        loadComponent: () =>
          import('./features/trip-wizard/steps/wizard-flight-step.component').then(m => m.WizardFlightStepComponent),
      },
      {
        path: 'hotels',
        loadComponent: () =>
          import('./features/trip-wizard/steps/wizard-hotel-step.component').then(m => m.WizardHotelStepComponent),
      },
      {
        path: 'cars',
        loadComponent: () =>
          import('./features/trip-wizard/steps/wizard-car-step.component').then(m => m.WizardCarStepComponent),
      },
      {
        path: 'transport',
        loadComponent: () =>
          import('./features/trip-wizard/steps/wizard-transport-step.component').then(m => m.WizardTransportStepComponent),
      },
      {
        path: 'tours',
        loadComponent: () =>
          import('./features/trip-wizard/steps/wizard-tour-step.component').then(m => m.WizardTourStepComponent),
      },
      {
        path: 'attractions',
        loadComponent: () =>
          import('./features/trip-wizard/steps/wizard-attraction-step.component').then(m => m.WizardAttractionStepComponent),
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./features/trip-wizard/steps/wizard-review-step.component').then(m => m.WizardReviewStepComponent),
      },
    ],
  },
  {
    path: 'search',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/search/search.component').then(m => m.SearchComponent),
  },
  {
    path: 'itinerary',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/itinerary/itinerary.component').then(m => m.ItineraryComponent),
  },
  {
    path: 'hotels',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/hotel-search/hotel-search.component').then(m => m.HotelSearchComponent),
  },
  {
    path: 'cars',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/car-search/car-search.component').then(m => m.CarSearchComponent),
  },
  {
    path: 'transport',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/transport-search/transport-search.component').then(m => m.TransportSearchComponent),
  },
  {
    path: 'tours',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tour-search/tour-search.component').then(m => m.TourSearchComponent),
  },
  {
    path: 'attractions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/attraction-search/attraction-search.component').then(m => m.AttractionSearchComponent),
  },
  { path: '**', redirectTo: 'home' },
];
