import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then(m => m.SearchComponent),
  },
  {
    path: 'itinerary',
    loadComponent: () =>
      import('./features/itinerary/itinerary.component').then(m => m.ItineraryComponent),
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
  { path: '**', redirectTo: 'search' },
];
