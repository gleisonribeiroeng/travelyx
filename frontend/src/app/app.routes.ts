import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { tripGuard } from './core/guards/trip.guard';
import { planGuard } from './core/guards/plan.guard';

export const routes: Routes = [
  // ── Public routes ──
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

  // ── Trip list (authenticated, no trip context needed) ──
  {
    path: 'viagens',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/trip-list/trip-list.component').then(m => m.TripListComponent),
  },

  // ── Admin routes ──
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/user-management/user-management.component').then(m => m.UserManagementComponent),
  },

  // ── Trip-scoped routes ──
  {
    path: 'viagem/:tripId',
    canActivate: [authGuard, tripGuard],
    loadComponent: () =>
      import('./features/trip-shell/trip-shell.component').then(m => m.TripShellComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/trip-dashboard/trip-dashboard.component').then(m => m.TripDashboardComponent),
      },
      {
        path: 'planner',
        loadComponent: () =>
          import('./features/trip-wizard/trip-wizard.component').then(m => m.TripWizardComponent),
        children: [
          { path: '', redirectTo: 'flights', pathMatch: 'full' },
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
        loadComponent: () =>
          import('./features/search/search.component').then(m => m.SearchComponent),
      },
      {
        path: 'hotels',
        loadComponent: () =>
          import('./features/hotel-search/hotel-search.component').then(m => m.HotelSearchComponent),
      },
      {
        path: 'cars',
        loadComponent: () =>
          import('./features/car-search/car-search.component').then(m => m.CarSearchComponent),
      },
      {
        path: 'transport',
        loadComponent: () =>
          import('./features/transport-search/transport-search.component').then(m => m.TransportSearchComponent),
      },
      {
        path: 'tours',
        loadComponent: () =>
          import('./features/tour-search/tour-search.component').then(m => m.TourSearchComponent),
      },
      {
        path: 'attractions',
        loadComponent: () =>
          import('./features/attraction-search/attraction-search.component').then(m => m.AttractionSearchComponent),
      },
      {
        path: 'timeline',
        loadComponent: () =>
          import('./features/timeline/timeline.component').then(m => m.TimelineComponent),
      },
      {
        path: 'itinerary',
        loadComponent: () =>
          import('./features/itinerary/itinerary.component').then(m => m.ItineraryComponent),
      },
      {
        path: 'budget',
        canActivate: [planGuard('budget')],
        loadComponent: () =>
          import('./features/budget/budget.component').then(m => m.BudgetComponent),
      },
      {
        path: 'conflicts',
        canActivate: [planGuard('conflictDetails')],
        loadComponent: () =>
          import('./features/conflicts/conflicts.component').then(m => m.ConflictsComponent),
      },
      {
        path: 'checklist',
        canActivate: [planGuard('checklist')],
        loadComponent: () =>
          import('./features/checklist/checklist.component').then(m => m.ChecklistComponent),
      },
      {
        path: 'documents',
        canActivate: [planGuard('documents')],
        loadComponent: () =>
          import('./features/documents/documents.component').then(m => m.DocumentsComponent),
      },
      {
        path: 'active-trip',
        canActivate: [planGuard('activeTrip')],
        loadComponent: () =>
          import('./features/active-trip/active-trip.component').then(m => m.ActiveTripComponent),
      },
    ],
  },

  // ── Legacy redirects ──
  { path: 'home', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'search', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'itinerary', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'timeline', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'budget', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'conflicts', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'checklist', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'documents', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'active-trip', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'hotels', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'cars', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'transport', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'tours', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'attractions', redirectTo: 'viagens', pathMatch: 'full' },
  { path: 'planner', redirectTo: 'viagens', pathMatch: 'full' },

  { path: '**', redirectTo: 'viagens' },
];
