# Requirements: Triply

**Defined:** 2026-02-11
**Core Value:** O usuario sai do zero ao roteiro completo em uma unica sessao — buscando voos, hotel, passeios e atracoes, adicionando tudo a um timeline organizado por dia e horario, sem criar conta.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Angular 17+ project with standalone components, signals, and modular architecture by feature
- [x] **FOUND-02**: Angular Material integrated as design system with shared component re-exports
- [x] **FOUND-03**: Layout base with header, footer, and navigation between search and itinerary
- [x] **FOUND-04**: Environment configuration for API keys and endpoints
- [x] **FOUND-05**: Design system foundation with consistent spacing, typography, and color tokens

### API Infrastructure

- [ ] **API-01**: HTTP service abstraction layer with per-feature ApiService + Mapper pattern
- [ ] **API-02**: Functional interceptors for auth (API key injection), error normalization, and loading state
- [ ] **API-03**: Standardized API response mapping from external schemas to internal canonical models
- [ ] **API-04**: Centralized API configuration service for key management
- [ ] **API-05**: CORS proxy strategy validated and operational for all blocked APIs
- [ ] **API-06**: Per-source error handling with catchError on each observable (no forkJoin failures)
- [ ] **API-07**: debounceTime on search triggers and exponential backoff on 429 responses

### State & Persistence

- [ ] **STATE-01**: TripStateService as signal-based global state (single source of truth)
- [ ] **STATE-02**: Canonical internal models defined: Trip, Flight, Stay, CarRental, Transport, Activity, Attraction, ItineraryItem
- [ ] **STATE-03**: Auto-persistence to localStorage via effect() on every state change
- [ ] **STATE-04**: Trip recovery on app startup from localStorage
- [ ] **STATE-05**: Safe localStorage wrapper with try/catch and QuotaExceededError handling

### Flights

- [ ] **FLIGHT-01**: Search by origin, destination, dates, and passengers
- [ ] **FLIGHT-02**: Filter results by direct/with stopovers
- [ ] **FLIGHT-03**: Results displayed as cards with price, duration, airline, and stops
- [ ] **FLIGHT-04**: "Add to itinerary" button on each result card
- [ ] **FLIGHT-05**: External provider redirect link on each result

### Hotels

- [ ] **HOTEL-01**: Search by destination and check-in/check-out dates
- [ ] **HOTEL-02**: Results displayed as cards with price, rating, and external link
- [ ] **HOTEL-03**: "Add to itinerary" button on each result card
- [ ] **HOTEL-04**: External provider redirect link on each result

### Car Rental

- [ ] **CAR-01**: Search by pick-up location, dates, and times
- [ ] **CAR-02**: Basic filters on results (vehicle type, price range)
- [ ] **CAR-03**: Results displayed as cards
- [ ] **CAR-04**: "Add to itinerary" button on each result card
- [ ] **CAR-05**: External provider redirect link on each result

### Intercity Transport

- [ ] **TRANS-01**: Search by origin city and destination city
- [ ] **TRANS-02**: Results listing transport options (bus/train) with duration and price
- [ ] **TRANS-03**: External provider redirect link on each result
- [ ] **TRANS-04**: "Add to itinerary" button on each result card

### Tours & Experiences

- [ ] **TOUR-01**: Search by destination
- [ ] **TOUR-02**: Results displayed as cards with description and price
- [ ] **TOUR-03**: External provider redirect link on each result
- [ ] **TOUR-04**: "Add to itinerary" button on each result card

### Attractions

- [ ] **ATTR-01**: List tourist attractions by city
- [ ] **ATTR-02**: Display official link if available
- [ ] **ATTR-03**: "Add to itinerary" button on each attraction

### Itinerary

- [ ] **ITIN-01**: Day-by-day timeline view organized by date
- [ ] **ITIN-02**: Items organized by time slot within each day
- [ ] **ITIN-03**: Reorder items within a day (simple reordering, no advanced drag-and-drop)
- [ ] **ITIN-04**: Create custom manual items with name, date, time, and notes
- [ ] **ITIN-05**: Edit existing itinerary items
- [ ] **ITIN-06**: Remove itinerary items
- [ ] **ITIN-07**: All search result additions auto-populate date/time in itinerary

### UX & Polish

- [ ] **UX-01**: Loading states on all search operations (per-source, not global spinner)
- [ ] **UX-02**: Empty states for no results and no itinerary items
- [ ] **UX-03**: Visual error treatment with per-source error banners
- [ ] **UX-04**: Mobile-responsive layout across all views
- [ ] **UX-05**: Consistent Angular Material card design across all 6 search categories
- [ ] **UX-06**: Clear navigation between search categories and itinerary view
- [ ] **UX-07**: Primary action (add to itinerary) always visually highlighted

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Itinerary

- **ITIN-V2-01**: Drag-and-drop reordering with Angular CDK DragDrop
- **ITIN-V2-02**: Shareable trip link (URL-encoded base64 of trip state, no backend)
- **ITIN-V2-03**: Contextual search driven by active itinerary day/destination
- **ITIN-V2-04**: Time-gap visualization between itinerary items

### Search Enhancements

- **SRCH-V2-01**: Price comparison across multiple providers for same route/hotel
- **SRCH-V2-02**: Search form state persisted in URL query params
- **SRCH-V2-03**: "Prices from X minutes ago" timestamp with refresh button

### Platform

- **PLAT-V2-01**: User accounts for cross-device sync
- **PLAT-V2-02**: Backend proxy replacing Cloudflare Worker
- **PLAT-V2-03**: Affiliate tracking and monetization integration

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Authentication / login | Blocks launch; localStorage + no-login is the differentiator |
| In-app booking / checkout | PCI compliance, payment processing — orders-of-magnitude scope increase |
| Real-time price updates | Polling costs, rate limits, stale-price confusion |
| Offline PWA / service workers | Complex cache strategy; localStorage already provides basic persistence |
| AI trip generation | LLM dependency, hallucination risk, scope creep |
| Mobile native app | Web responsivo is sufficient for v1 |
| Advanced drag-and-drop | Simple reordering is sufficient; CDK DragDrop deferred to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Done |
| FOUND-02 | Phase 1 | Done |
| FOUND-03 | Phase 1 | Done |
| FOUND-04 | Phase 1 | Done |
| FOUND-05 | Phase 1 | Done |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| API-05 | Phase 2 | Pending |
| API-06 | Phase 2 | Pending |
| API-07 | Phase 2 | Pending |
| STATE-01 | Phase 3 | Pending |
| STATE-02 | Phase 3 | Pending |
| STATE-03 | Phase 3 | Pending |
| STATE-04 | Phase 3 | Pending |
| STATE-05 | Phase 3 | Pending |
| FLIGHT-01 | Phase 4 | Pending |
| FLIGHT-02 | Phase 4 | Pending |
| FLIGHT-03 | Phase 4 | Pending |
| FLIGHT-04 | Phase 4 | Pending |
| FLIGHT-05 | Phase 4 | Pending |
| HOTEL-01 | Phase 5 | Pending |
| HOTEL-02 | Phase 5 | Pending |
| HOTEL-03 | Phase 5 | Pending |
| HOTEL-04 | Phase 5 | Pending |
| CAR-01 | Phase 6 | Pending |
| CAR-02 | Phase 6 | Pending |
| CAR-03 | Phase 6 | Pending |
| CAR-04 | Phase 6 | Pending |
| CAR-05 | Phase 6 | Pending |
| TRANS-01 | Phase 7 | Pending |
| TRANS-02 | Phase 7 | Pending |
| TRANS-03 | Phase 7 | Pending |
| TRANS-04 | Phase 7 | Pending |
| TOUR-01 | Phase 8 | Pending |
| TOUR-02 | Phase 8 | Pending |
| TOUR-03 | Phase 8 | Pending |
| TOUR-04 | Phase 8 | Pending |
| ATTR-01 | Phase 9 | Pending |
| ATTR-02 | Phase 9 | Pending |
| ATTR-03 | Phase 9 | Pending |
| ITIN-01 | Phase 10 | Pending |
| ITIN-02 | Phase 10 | Pending |
| ITIN-03 | Phase 10 | Pending |
| ITIN-04 | Phase 10 | Pending |
| ITIN-05 | Phase 10 | Pending |
| ITIN-06 | Phase 10 | Pending |
| ITIN-07 | Phase 10 | Pending |
| UX-01 | Phase 11 | Pending |
| UX-02 | Phase 11 | Pending |
| UX-03 | Phase 11 | Pending |
| UX-04 | Phase 11 | Pending |
| UX-05 | Phase 11 | Pending |
| UX-06 | Phase 11 | Pending |
| UX-07 | Phase 11 | Pending |

**Coverage:**
- v1 requirements: 53 total
- Mapped to phases: 53
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
