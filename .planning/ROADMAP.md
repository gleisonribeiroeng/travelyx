# Roadmap: Triply

## Overview

Triply is a frontend-only Angular travel planning aggregator that lets users search 6 travel categories, combine results into a day-by-day itinerary, and redirect to external providers for booking — all without creating an account. The roadmap starts with project scaffolding and a validated API layer, builds shared state, then delivers each search feature as a self-contained vertical slice, closes with the itinerary builder that consumes all prior state, and finishes with a UX polish pass to make the product feel complete.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Angular 17+ project scaffold with Angular Material, modular architecture, layout base, environments, and design system *(completed 2026-02-11)*
- [x] **Phase 2: API Integration Layer** - HTTP service abstraction, functional interceptors, response mappers, API key config, CORS proxy validation, error handling, and rate-limit patterns *(completed 2026-02-12)*
- [ ] **Phase 3: State & Persistence** - Signal-based TripStateService, all canonical models, localStorage persistence with safe wrapper, and trip recovery on startup
- [ ] **Phase 4: Flights** - End-to-end flight search with filters, result cards, add to itinerary, and provider redirect
- [ ] **Phase 5: Hotels** - End-to-end hotel search with result cards showing price/rating, add to itinerary, and provider redirect
- [ ] **Phase 6: Car Rental** - End-to-end car rental search with filters, result cards, add to itinerary, and provider redirect
- [ ] **Phase 7: Intercity Transport** - End-to-end intercity transport search (bus/train), result listing, external link, and add to itinerary
- [ ] **Phase 8: Tours & Experiences** - End-to-end tours and experiences search, result cards with description and price, external link, and add to itinerary
- [ ] **Phase 9: Attractions** - Attraction listing by city with official link and add to itinerary
- [ ] **Phase 10: Itinerary Builder** - Day-by-day timeline view reading from TripStateService, manual items, edit/remove, and reorder
- [ ] **Phase 11: UX Polish** - Loading states, empty states, per-source error banners, mobile responsiveness, performance, and visual consistency across all 6 search categories

## Phase Details

### Phase 1: Foundation
**Goal**: The app shell is running, navigable, and visually coherent — ready to receive feature modules
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. Angular app builds and serves with zero errors using standalone components and signals
  2. Angular Material theme is applied — buttons, cards, and typography use the design system consistently
  3. User can navigate between the search view and the itinerary view using the header navigation
  4. Environment files exist for dev and production with placeholder slots for API keys and endpoints
  5. Spacing, typography, and color tokens are defined and applied consistently across the layout shell
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Angular project scaffold (standalone, signals, routing, lazy routes skeleton)
- [x] 01-02-PLAN.md — Angular Material integration and design system tokens (theme, shared component re-exports)
- [x] 01-03-PLAN.md — Layout shell (header, footer, navigation between search and itinerary views)
- [x] 01-04-PLAN.md — Environment configuration for API keys and endpoints

---

### Phase 2: API Integration Layer
**Goal**: All HTTP concerns are handled in one place — interceptors, mappers, API key injection, CORS strategy, error isolation, and rate-limit patterns are validated and operational before any feature writes service code
**Depends on**: Phase 1
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07
**Success Criteria** (what must be TRUE):
  1. Every target API (flights, hotels, cars, transport, tours, attractions) has been tested for CORS from a production-equivalent URL and the strategy (proxy or direct) is documented per API
  2. API keys are injected via functional interceptor and never appear in the Angular bundle; the proxy or domain-restriction strategy is active
  3. A search request with a bad API key or network failure returns a normalized error shape — no unhandled exceptions visible to the user
  4. A rapid sequence of search triggers is debounced; a 429 response triggers exponential backoff and retries automatically
  5. Each API service module follows the ApiService + Mapper pattern and can be imported independently by any feature module
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md -- Core API infrastructure (ApiConfigService, AppError, LoadingService, 3 functional interceptors, provideHttpClient registration)
- [x] 02-02-PLAN.md -- Dev proxy configuration (proxy.conf.json for all API targets, angular.json proxyConfig)
- [x] 02-03-PLAN.md -- Shared abstractions (canonical model base types, Mapper interface, BaseApiService, per-source error handling utility)
- [x] 02-04-PLAN.md -- Rate-limit and search utilities (exponential backoff retry operator, debounced search operator)

---

### Phase 3: State & Persistence
**Goal**: The trip data layer is solid and self-healing — state is signal-based, persists automatically, and survives a browser refresh without any feature module needing to know about storage
**Depends on**: Phase 2
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04, STATE-05
**Success Criteria** (what must be TRUE):
  1. TripStateService exposes signals for all trip data; components read signals, not raw objects
  2. All canonical internal models (Trip, Flight, Stay, CarRental, Transport, Activity, Attraction, ItineraryItem) are defined and exported from a single models barrel
  3. Any change to trip state is automatically written to localStorage within one render cycle — no manual save action required
  4. Refreshing the browser restores the complete trip exactly as it was left, including all itinerary items
  5. A full 5MB localStorage quota does not crash the app — the safe wrapper handles QuotaExceededError gracefully with a visible warning
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md -- Canonical domain models barrel (all 8 types) + LocalStorageService safe wrapper (QuotaExceededError handling)
- [ ] 03-02-PLAN.md -- TripStateService (signal-based state, effect() auto-persistence, trip recovery on startup)

---

### Phase 4: Flights
**Goal**: Users can search for flights and add a result to their itinerary in one click
**Depends on**: Phase 3
**Requirements**: FLIGHT-01, FLIGHT-02, FLIGHT-03, FLIGHT-04, FLIGHT-05
**Success Criteria** (what must be TRUE):
  1. User can enter origin, destination, dates, and passenger count and receive a list of flight results
  2. User can filter results to show only direct flights or only flights with stopovers
  3. Each result card shows price, flight duration, airline, and number of stops
  4. Clicking "Add to itinerary" on a flight card adds it to TripStateService and it appears in the itinerary view
  5. Clicking the provider link on a result opens the external booking site in a new tab
**Plans**: TBD

Plans:
- [ ] 04-01: FlightApiService + FlightMapper (Amadeus or chosen provider integration)
- [ ] 04-02: Flight search form component (origin, destination, dates, passengers)
- [ ] 04-03: Flight result cards with filter (direct/stopovers), add to itinerary action, and provider redirect

---

### Phase 5: Hotels
**Goal**: Users can search for hotels and add a result to their itinerary in one click
**Depends on**: Phase 3
**Requirements**: HOTEL-01, HOTEL-02, HOTEL-03, HOTEL-04
**Success Criteria** (what must be TRUE):
  1. User can enter destination and check-in/check-out dates and receive a list of hotel results
  2. Each result card shows price per night, star rating, and hotel name
  3. Clicking "Add to itinerary" on a hotel card adds it to TripStateService and it appears in the itinerary view
  4. Clicking the provider link opens the hotel's external booking page in a new tab
**Plans**: TBD

Plans:
- [ ] 05-01: HotelApiService + HotelMapper (Amadeus Hotels or chosen provider integration)
- [ ] 05-02: Hotel search form component (destination, check-in/out dates)
- [ ] 05-03: Hotel result cards with add to itinerary action and provider redirect

---

### Phase 6: Car Rental
**Goal**: Users can search for rental cars and add a result to their itinerary in one click
**Depends on**: Phase 3
**Requirements**: CAR-01, CAR-02, CAR-03, CAR-04, CAR-05
**Success Criteria** (what must be TRUE):
  1. User can enter pick-up location, dates, and times and receive a list of car rental results
  2. User can filter results by vehicle type or price range
  3. Each result card shows the vehicle name, category, and price
  4. Clicking "Add to itinerary" on a car card adds it to TripStateService and it appears in the itinerary view
  5. Clicking the provider link opens the rental site in a new tab
**Plans**: TBD

Plans:
- [ ] 06-01: CarApiService + CarMapper (RentalCars.com or Amadeus Cars integration)
- [ ] 06-02: Car rental search form component (pick-up location, dates, times)
- [ ] 06-03: Car result cards with filters (vehicle type, price range), add to itinerary action, and provider redirect

---

### Phase 7: Intercity Transport
**Goal**: Users can search for bus or train connections between cities and add a result to their itinerary
**Depends on**: Phase 3
**Requirements**: TRANS-01, TRANS-02, TRANS-03, TRANS-04
**Success Criteria** (what must be TRUE):
  1. User can enter an origin city and destination city and receive a list of transport options (bus and/or train)
  2. Each result shows the transport mode, duration, and price
  3. Clicking the provider link opens the external booking page in a new tab
  4. Clicking "Add to itinerary" adds the transport leg to TripStateService and it appears in the itinerary view
**Plans**: TBD

Plans:
- [ ] 07-01: TransportApiService + TransportMapper (Rome2rio or fallback integration)
- [ ] 07-02: Intercity transport search form component (origin city, destination city)
- [ ] 07-03: Transport result listing with add to itinerary action and external link

---

### Phase 8: Tours & Experiences
**Goal**: Users can search for tours and experiences at a destination and add one to their itinerary
**Depends on**: Phase 3
**Requirements**: TOUR-01, TOUR-02, TOUR-03, TOUR-04
**Success Criteria** (what must be TRUE):
  1. User can enter a destination and receive a list of available tours and experiences
  2. Each result card shows the tour name, description, and price
  3. Clicking the provider link opens the external booking page in a new tab
  4. Clicking "Add to itinerary" adds the tour to TripStateService and it appears in the itinerary view
**Plans**: TBD

Plans:
- [ ] 08-01: TourApiService + TourMapper (Viator or GetYourGuide integration)
- [ ] 08-02: Tours search form component (destination)
- [ ] 08-03: Tour result cards with add to itinerary action and provider redirect

---

### Phase 9: Attractions
**Goal**: Users can browse tourist attractions for a city and add any attraction to their itinerary
**Depends on**: Phase 3
**Requirements**: ATTR-01, ATTR-02, ATTR-03
**Success Criteria** (what must be TRUE):
  1. User can enter a city name and receive a list of tourist attractions for that city
  2. Each attraction displays an official link when one is available
  3. Clicking "Add to itinerary" adds the attraction to TripStateService and it appears in the itinerary view
**Plans**: TBD

Plans:
- [ ] 09-01: AttractionApiService + AttractionMapper (OpenTripMap or Foursquare integration)
- [ ] 09-02: Attractions list component (city input, result list with official link and add to itinerary action)

---

### Phase 10: Itinerary Builder
**Goal**: Users can view, organize, and edit a complete day-by-day trip timeline assembled from all items added during Phases 4–9
**Depends on**: Phase 3 (reads TripStateService populated by Phases 4–9)
**Requirements**: ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06, ITIN-07
**Success Criteria** (what must be TRUE):
  1. All items added from any search category appear in the itinerary organized by date, each on the correct day
  2. Items within a day are ordered by time slot; items with the same time are grouped logically
  3. User can reorder items within a day using simple up/down controls (no advanced drag-and-drop required)
  4. User can create a manual itinerary item by providing a name, date, time, and optional notes — and it appears alongside search-sourced items
  5. User can edit any itinerary item's details (date, time, notes) inline or via a form
  6. User can remove any itinerary item; the item is permanently deleted from the trip
**Plans**: TBD

Plans:
- [ ] 10-01: ItineraryViewComponent — day-by-day timeline reading from TripStateService computed signals
- [ ] 10-02: ItineraryItemComponent — display card with edit, remove, and reorder actions
- [ ] 10-03: Manual item add/edit form (name, date, time, notes)
- [ ] 10-04: Reorder logic within a day (simple position swap, no CDK DragDrop)

---

### Phase 11: UX Polish
**Goal**: The complete app is production-ready — every search operation communicates its state clearly, every empty surface gives users direction, every error is scoped to its source, and the layout is usable on mobile
**Depends on**: Phase 10
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07
**Success Criteria** (what must be TRUE):
  1. While any search is loading, a per-source loading indicator is visible — no single global spinner blocks the entire page
  2. When search returns zero results or the itinerary is empty, a clear empty-state message explains what to do next
  3. When an individual API source fails, an error banner appears for that source only — other sources still display their results
  4. All views are usable and visually correct on a 375px mobile screen (no horizontal overflow, no overlapping text)
  5. All 6 search category result cards share the same Angular Material card design — visual consistency is immediately apparent
  6. The navigation between search categories and the itinerary view is visible and reachable from every page, and the primary "Add to itinerary" action is always the most prominent button on result cards
**Plans**: TBD

Plans:
- [ ] 11-01: Per-source loading states across all 6 search categories
- [ ] 11-02: Empty states for all search and itinerary views
- [ ] 11-03: Per-source error banners with dismissal
- [ ] 11-04: Mobile-responsive layout audit and fixes across all views
- [ ] 11-05: Visual consistency pass — unified Angular Material card design across all 6 categories
- [ ] 11-06: Navigation and primary action prominence audit

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-02-11 |
| 2. API Integration Layer | 4/4 | Complete | 2026-02-12 |
| 3. State & Persistence | 0/2 | Not started | - |
| 4. Flights | 0/3 | Not started | - |
| 5. Hotels | 0/3 | Not started | - |
| 6. Car Rental | 0/3 | Not started | - |
| 7. Intercity Transport | 0/3 | Not started | - |
| 8. Tours & Experiences | 0/3 | Not started | - |
| 9. Attractions | 0/2 | Not started | - |
| 10. Itinerary Builder | 0/4 | Not started | - |
| 11. UX Polish | 0/6 | Not started | - |

---
*Roadmap created: 2026-02-11*
*Coverage: 53/53 v1 requirements mapped — 0 orphans*
