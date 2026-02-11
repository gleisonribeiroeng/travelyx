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
  { path: '**', redirectTo: 'search' },
];
