# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** O usuario sai do zero ao roteiro completo em uma unica sessao — buscando voos, hotel, passeios e atracoes, adicionando tudo a um timeline organizado por dia e horario, sem criar conta.
**Current focus:** Phase 11 — UX Polish

## Current Position

Phase: 11 of 11 (UX Polish)
Plan: 3 of 6 in current phase
Status: Executing
Last activity: 2026-02-12 — Completed plan 11-03 (Error Banners for Flights/Hotels/Cars)

Progress: [█████████░] 93%

## Performance Metrics

**Velocity:**
- Total plans completed: 26
- Average duration: 2 min
- Total execution time: 1.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 12 min | 3 min |
| 02-api-integration-layer | 4/4 | 6 min | 2 min |
| 03-state-persistence | 2/2 | 4 min | 2 min |
| 04-flights | 2/2 | 6 min | 3 min |
| 05-hotels | 2/2 | 5 min | 2 min |
| 06-car-rental | 2/2 | 5 min | 2 min |
| 07-intercity-transport | 2/2 | 5 min | 2 min |
| 08-tours-experiences | 2/2 | 3 min | 1 min |
| 09-attractions | 2/2 | 4 min | 2 min |
| 10-itinerary-builder | 3/3 | 8 min | 2 min |
| 11-ux-polish | 3/6 | 5 min | 2 min |

**Recent Trend:**
- Last 5 plans: 10-01, 10-02, 10-03, 11-01, 11-03
- Trend: stable

*Updated after each plan completion*
| Phase 10 P03 | 2 min | 1 task | 7 files |
| Phase 10-itinerary-builder P10-02 | 2 | 2 tasks | 5 files |
| Phase 11-ux-polish P01 | 1 min | 1 task | 1 file |
| Phase 11-ux-polish P03 | 4 min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- All phases: Angular Signals for state, no NgRx — TripStateService is signal-based
- Phase 2: CORS proxy is mandatory before any API integration — validate every API from production URL
- Phase 2: API keys must never appear in Angular bundle — proxy or domain-restriction from day one
- Phase 2+: Per-source catchError on every observable — no forkJoin that fails the entire page
- Phase 4-9: All search features follow identical pattern: ApiService + Mapper + search form + result cards + add to itinerary
- 01-01: Angular CLI v21 was used (not v19) — components use .component.ts suffix manually; exports named SearchComponent/ItineraryComponent
- 01-01: Feature component naming pattern established: features/{name}/{name}.component.ts with standalone: true
- 01-02: mat.theme() SCSS mixin used (not prebuilt CSS) — generates --mat-sys-* tokens at build time, fully customizable
- 01-02: provideAnimationsAsync() over provideAnimations() — async loads animation bundle lazily for better initial load
- 01-02: Feature components import MATERIAL_IMPORTS from core/material.exports instead of individual modules
- 01-04: All API keys use empty string placeholders in environment files — never real values in version control
- 01-04: 8 API key slots established: amadeusApiKey, amadeusApiSecret, hotelApiKey, carRentalApiKey, transportApiKey, toursApiKey, attractionsApiKey, googlePlacesApiKey
- 01-04: Development apiBaseUrl set to localhost:4200 as proxy base for Phase 2 CORS handling
- 02-01: Interceptor order: apiKey -> error -> loading — keys injected first, errors normalized second, loading wraps full lifecycle via finalize()
- 02-01: loadingInterceptor uses only finalize() — guarantees decrement on both success and error without catchError interference
- 02-01: API_SOURCE HttpContextToken exported from api-key.interceptor — feature services set source identity per-request for key injection and error attribution
- 02-02: Transport API proxy entry uses placeholder https://api.example.com — Rome2rio unavailable, provider TBD before Phase 7
- 02-02: Hotels and cars share same RapidAPI proxy host — path differentiation handled in service layer
- 02-03: BaseApiService is abstract with no @Injectable — subclasses declare their own @Injectable({ providedIn: 'root' }) to avoid double-registration
- 02-03: ApiResult<T> uses discriminated union on error (null vs AppError) enabling TypeScript type narrowing via result.error !== null
- 02-03: withFallback is a function returning an operator (not a class) to match RxJS pipe() ergonomics
- 02-04: retryIndex in modern retry() callback starts at 1, so delay = initialDelay * 2^(retryIndex-1) produces 1s/2s/4s sequence
- 02-04: debouncedSearch uses JSON.stringify deep comparison in distinctUntilChanged — object form values require deep not referential equality
- 03-01: All datetime fields use string type (ISO 8601) not Date objects — ensures JSON round-trips without type mismatch after deserialization
- 03-01: LocalStorageService swallows non-quota errors silently (SecurityError in private browsing) — app continues with in-memory state only
- 03-01: isQuotaExceededError checks both code (22, 1014) and name variants — cross-browser coverage for Chrome, Firefox, and modern browsers
- 03-02: Signal initializer provides synchronous localStorage hydration — no APP_INITIALIZER needed
- 03-02: effect() in constructor registers _trip() as dependency automatically — every mutation triggers re-persistence without explicit save calls
- 03-02: resetTrip() generates a fresh UUID inline rather than spreading DEFAULT_TRIP — avoids sharing module-level identity with live state
- 04-01: OAuth2 tokens cached for 30 minutes with 2-minute proactive refresh buffer before expiry
- 04-01: searchAirports() silently returns empty array on error — autocomplete must never surface errors to user
- 04-01: Stops count calculated from segments.length - 1, NOT using segment.numberOfStops which is per-segment
- 04-01: OAuth2 token endpoint uses application/x-www-form-urlencoded Content-Type with URLSearchParams body
- 04-02: Autocomplete uses string type guard with explicit (v as string) cast to satisfy TypeScript strict mode
- 04-02: Filter chip counts use helper methods (countDirectFlights/countStopoverFlights) because Angular template parser rejects arrow functions in interpolation bindings
- 04-02: Search button split into two separate buttons wrapped in @if/@else to avoid Angular content projection warnings with Material button slots
- 04-02: Airport validator returns null for empty values (lets required validator handle), invalidAirport error for string or missing iataCode
- 05-01: RapidAPI sources (hotel, carRental) use X-RapidAPI-Key and X-RapidAPI-Host headers instead of X-API-Key
- 05-01: Hardcoded X-RapidAPI-Host to booking-com15.p.rapidapi.com for both hotel and carRental sources
- 05-01: searchDestinations() returns empty array on error — autocomplete must never surface errors
- 05-02: Hotels use two separate mat-datepicker inputs for check-in/check-out instead of mat-date-range-picker (cleaner UX, simpler validation)
- 05-02: Star rating rendered via renderStars() method returning array of icon names (star, star_half, star_border) for template iteration
- 06-01: CarMapper does NOT implement Mapper interface due to two-parameter mapResponse signature (raw + params) incompatible with single-parameter interface
- 06-01: carRentalApiKey can share same RapidAPI key as hotelApiKey (both use booking-com15 provider)
- 06-01: Booking.com car API endpoint and parameters are hypothetical, must be verified at runtime via RapidAPI dashboard
- 06-02: Plain text location inputs instead of autocomplete for car rental (simpler, avoids overengineering for unverified API)
- 06-02: Native time input (<input type='time'>) combined with mat-datepicker for datetime selection (better UX than custom Material time picker)
- 06-02: Client-side filtering only for car rental (vehicle type, max price) - no API filter params since endpoint is hypothetical
- 06-02: ISO 8601 datetime built from separate date + time inputs (YYYY-MM-DDTHH:MM:00 format) in submit handler
- 07-01: TransportMapper does NOT implement Mapper interface due to two-parameter mapResponse signature (raw + params) matching CarMapper pattern
- 07-01: Transport uses standard X-API-Key authentication (not RapidAPI X-RapidAPI-Key/Host headers)
- 07-01: Transport API endpoint /api/v1/transport/search is hypothetical placeholder — must be updated when provider selected
- 07-01: Mode normalization uses case-insensitive substring matching to map to 'bus' | 'train' | 'ferry' | 'other' union type
- 07-01: Duration parser supports three formats: number (minutes), ISO 8601 (PT2H30M), human-readable (2h 30m)
- 07-02: Plain text city inputs for transport search (no autocomplete) following car-search pattern for simplicity
- 07-02: Single departure date for transport (no return date) as intercity transport is typically one-way
- 07-02: Client-side mode filtering via computed signal (bus/train/ferry) for instant results and better UX
- 07-02: Mat-chip [highlighted] binding uses boolean input for visual selection state in mode filter
- 07-02: Duration formatted as "Xh Ym" via helper method converting durationMinutes to human-readable format
- [Phase 08]: Use POST for Viator /partner/products/search (API requires request body)
- [Phase 08]: Use ?? null for durationMinutes (preserves null for missing values, not 0)
- [Phase 08]: Tours use standard X-API-Key authentication (not RapidAPI X-RapidAPI-Key/Host headers)
- [Phase 08-02]: Tours search uses destination-only form (simpler than transport/hotel multi-field forms)
- [Phase 08-02]: Description clamped to 3 lines with -webkit-line-clamp for compact cards
- [Phase 08-02]: Duration null handling with explicit 'Flexible duration' text instead of hiding field
- [Phase 09-01]: Use museum icon for Attractions nav link (most recognizable for tourist attractions)
- [Phase 09-01]: Three-step OpenTripMap flow with switchMap chaining (geoname -> radius -> details enrichment)
- [Phase 09-01]: Nullable link pattern for attractions without official URLs (link: ExternalLink | null)
- [Phase 09-02]: AttractionSearchComponent uses city-only form (simpler pattern from tours, not multi-field like hotels/transport)
- [Phase 09-02]: NO sorting computed signal for attractions (no price field to sort by, unlike tours)
- [Phase 09-02]: Conditional link rendering with @if (attraction.link !== null) for nullable link field
- [Phase 09-02]: Category displayed as mat-chip for visual distinction and scannability
- [Phase 10-01]: Use reduce() instead of Object.groupBy() for broader TypeScript compatibility
- [Phase 10-01]: Shallow copy arrays before sorting to avoid mutating computed signal internals
- [Phase 10-01]: Persist order changes for ALL items in day (not just moved item) to maintain consistency
- [Phase 10-03]: Split ISO 8601 datetime strings on 'T' to extract date (YYYY-MM-DD) and time (HH:MM) separately
- [Phase 10-03]: Null timeSlot for all-day items (hotels, tours, attractions) — computed signal sorts null timeSlots first
- [Phase 10-03]: Tours/attractions use trip start date with today's date fallback when no inherent date available
- [Phase 10-03]: All ItineraryItem.order defaults to 0 at creation — user can reorder via UI drag-drop
- [Phase 10-02]: Use same timeSlotValidator from ItineraryItemComponent for consistency in custom item form
- [Phase 10-02]: ManualItemForm collapsed by default to avoid cluttering timeline view
- [Phase 10-02]: crypto.randomUUID() for custom item IDs, order: 0 as default (user can reorder later)
- [Phase 11-01]: ErrorBannerComponent uses single-file pattern with inline template/styles for simplicity — appropriate for small reusable UI components
- [Phase 11-01]: Error banner uses signal-based input.required() and output() APIs (not @Input/@Output decorators) following Angular 21 best practices
- [Phase 11-01]: Error banners are dismissible only (no auto-timeout) to match Material Design persistent error pattern requiring user acknowledgment
- [Phase 11-03]: Replace transient snackbar errors with persistent error banners for better error visibility — user must explicitly dismiss
- [Phase 11-03]: Use mat-raised-button for primary "Add to Itinerary" actions (visual prominence) while keeping external links as mat-button (secondary)
- [Phase 11-03]: Remove duplicate .empty-state styles from component SCSS — global styles from 11-02 now cover all search components

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: CORS status and access model for Amadeus, Rome2rio, Viator, OpenTripMap must be validated live — training data claims are LOW confidence
- Phase 8: Viator partner API may require a partnership application with lead time — investigate early before Phase 8 begins

## Session Continuity

Last session: 2026-02-12T20:40:01Z
Stopped at: Completed 11-03-PLAN.md
Resume file: None
