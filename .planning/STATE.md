# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** O usuario sai do zero ao roteiro completo em uma unica sessao — buscando voos, hotel, passeios e atracoes, adicionando tudo a um timeline organizado por dia e horario, sem criar conta.
**Current focus:** Phase 4 — Flights

## Current Position

Phase: 4 of 11 (Flights)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-02-12 — Phase 3 State & Persistence complete (verified)

Progress: [███░░░░░░░] 27%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 2 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 12 min | 3 min |
| 02-api-integration-layer | 4/4 | 6 min | 2 min |
| 03-state-persistence | 2/2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 02-02, 02-03, 02-04, 03-01, 03-02
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

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: CORS status and access model for Amadeus, Rome2rio, Viator, OpenTripMap must be validated live — training data claims are LOW confidence
- Phase 8: Viator partner API may require a partnership application with lead time — investigate early before Phase 8 begins

## Session Continuity

Last session: 2026-02-12
Stopped at: Phase 3 State & Persistence complete and verified — ready to plan Phase 4
Resume file: None
