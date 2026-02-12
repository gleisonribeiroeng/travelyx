# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** O usuario sai do zero ao roteiro completo em uma unica sessao — buscando voos, hotel, passeios e atracoes, adicionando tudo a um timeline organizado por dia e horario, sem criar conta.
**Current focus:** Phase 6 — Car Rental

## Current Position

Phase: 6 of 11 (Car Rental)
Plan: 1 of 2 in current phase
Status: Executing
Last activity: 2026-02-12 — Completed 06-01-PLAN.md (Car Rental API Service and Navigation)

Progress: [█████░░░░░] 48%

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 2 min
- Total execution time: 0.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 12 min | 3 min |
| 02-api-integration-layer | 4/4 | 6 min | 2 min |
| 03-state-persistence | 2/2 | 4 min | 2 min |
| 04-flights | 2/2 | 6 min | 3 min |
| 05-hotels | 2/2 | 5 min | 2 min |
| 06-car-rental | 1/2 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 04-01, 04-02, 05-01, 05-02, 06-01
- Trend: stable

*Updated after each plan completion*

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

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: CORS status and access model for Amadeus, Rome2rio, Viator, OpenTripMap must be validated live — training data claims are LOW confidence
- Phase 8: Viator partner API may require a partnership application with lead time — investigate early before Phase 8 begins

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 06-01-PLAN.md — Car Rental API Service and Navigation complete
Resume file: None
