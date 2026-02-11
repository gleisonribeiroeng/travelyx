# Project Research Summary

**Project:** Triply — Travel Planning Aggregator
**Domain:** Angular SPA, multi-API travel search + itinerary builder
**Researched:** 2026-02-11
**Confidence:** MEDIUM

## Executive Summary

Triply is a frontend-only travel planning aggregator that lets users search 6 travel categories (flights, hotels, cars, intercity transport, tours, attractions), combine results into a day-by-day itinerary, and link out to external providers for booking — all without creating an account. The established pattern for this type of app is a modular Angular SPA with a signal-based central state service, per-feature API services with mapper isolation, localStorage persistence, and a lightweight proxy layer to protect API keys and handle CORS. The no-login, no-backend constraint is a genuine differentiator and keeps scope manageable for v1; localStorage is sufficient for single-device use.

The recommended stack is Angular 19 + Angular Material 3 + hand-rolled Signals store (no NgRx) + RxJS for HTTP. For APIs: Amadeus for flights and hotels, Booking.com affiliate or Amadeus Hotels for hotel pricing depth, RentalCars.com API or Amadeus Cars for car rental, Rome2rio for intercity transport, Viator for tours and activities, and OpenTripMap (or Foursquare) for attractions/POIs. All API keys must be proxied through a Cloudflare Worker or Netlify Edge Function from day one — exposing API keys in the Angular bundle is a billing and ToS risk, not an acceptable shortcut even for MVP.

The three risks that can kill this project before it ships: (1) CORS failures discovered at deploy time rather than during Phase 1 API validation — validate every API from a production-equivalent environment before writing service code; (2) API keys in the Angular bundle being scraped and abused — non-negotiable to proxy before first deploy; (3) forkJoin without per-observable catchError causing blank result pages when one of 6 APIs is slow or down — partial results with per-source error banners are the correct pattern from the start.

---

## Key Findings

### Recommended Stack

Angular 19 with standalone components and the modern idioms (functional interceptors, functional guards, inject() at field level, signal-based state) is the correct choice — these patterns were stable in Angular 17 and are the idiomatic direction for 18+. No NgRx: a hand-rolled TripStateService using Angular signals is sufficient and simpler for this scope. RxJS handles HTTP observable chains; signals handle shared state. The boundary is: HttpClient returns Observables (kept as Observables in services), TripStateService exposes signals (state only).

For hosting: Netlify with a Cloudflare Worker proxy per blocked API. This keeps API keys server-side, handles CORS, and costs nothing at MVP scale. Build output is a static Angular app — no SSR needed for v1.

**Core technologies:**
- **Angular 19 (standalone)**: Framework — modern standalone + signals idioms, stable APIs, tree-shakeable
- **Angular Material 3**: Design system — ready-made responsive components, avoids custom CSS at scale
- **Angular Signals (hand-rolled TripStateService)**: Global state — simpler than NgRx, sufficient for this scope, no time-travel debugging needed
- **RxJS**: HTTP observable chains — HttpClient returns Observables; keep them Observables in services
- **Cloudflare Workers**: API proxy — keeps API keys server-side, handles CORS, free tier sufficient for MVP
- **Netlify**: Hosting — static Angular build, instant deploys, edge functions available for proxy fallback
- **Amadeus API**: Flights + Hotels — broad coverage, free test tier, official JS SDK available
- **Rome2rio API**: Intercity transport (trains/buses) — the dominant player in this category; no close alternative
- **Viator API**: Tours and activities — largest activity inventory; GetYourGuide is alternative
- **OpenTripMap**: Attractions/POIs — free, sufficient for attraction browsing; Foursquare is fallback

**Critical version note:** Validate Angular 18/19 specifics (e.g., signal inputs with `input()`, new control flow `@if`/`@for`) against angular.dev before implementation — training data through Jan 2025 may not reflect 19-specific idioms.

### Expected Features

The product is differentiated by covering all 6 search categories in one surface and by requiring no login. Most competitors (TripIt, Kayak Trips, Wanderlog) require accounts before saving anything. That zero-friction start is a real advantage and must not be traded away for backend convenience.

**Must have (table stakes for v1):**
- Trip state persistence via localStorage — all itinerary features depend on this; build first
- Day-by-day itinerary view — the primary product surface; the core reason users come
- Manual item add/edit/delete on itinerary — always needed for items not found via search
- Flight search with results list — highest user intent; anchor search category
- Hotel search with results list — always paired with flights
- Car rental search with results list — completes the transport trio
- Sort and filter on search results — without this, results are unusable for real decisions
- Add search result to itinerary with one click — connects search and organize
- Provider redirect (external book link) — the monetization path; all links `target="_blank" rel="noopener noreferrer"`
- Mobile-responsive layout — Angular Material handles the foundation; layout decisions matter

**Should have (v1.x, add after core loop validated):**
- Intercity transport search (buses/trains via Rome2rio) — genuine differentiator; reuses same results pattern
- Tours and activities search (Viator) — high value when destination context exists in itinerary
- Attractions/POI search — completes "what to do" layer; no booking flow, just browse + add
- Drag-and-drop itinerary reordering — polish; add when basic itinerary is validated
- Shareable trip link — URL-encoded base64 of localStorage state; no backend needed

**Defer (v2+):**
- Contextual search (search driven by active itinerary day/destination) — high value but needs mature state model
- Price comparison across providers — requires multi-API aggregation; significant scope
- User accounts / cross-device sync — only necessary when users demonstrate need beyond single session
- Time-gap visualization on itinerary — polish; defer until itinerary UX is stable
- AI trip generation — LLM dependency, hallucination risk, scope creep; skip v1

**Anti-features to reject explicitly:**
- Authentication in v1: blocks launch, localStorage + shareable link covers 80% of the value
- In-app booking/checkout: PCI compliance, payment processing — orders-of-magnitude scope increase
- Real-time price updates on itinerary: polling costs, rate limits, stale-price confusion
- Offline PWA/service workers: complex cache strategy, testing surface; localStorage already provides basic persistence

### Architecture Approach

The architecture is a layered Angular SPA with strict boundaries: Feature modules (flights, hotels, cars, transport, tours, attractions) communicate only through TripStateService — never directly to each other. Each feature has its own ApiService and Mapper that normalizes external API responses to internal canonical models. The itinerary module is a read-only view that assembles display from TripStateService signals. No NgModule boilerplate for features — standalone components with *.routes.ts as the feature boundary, lazy-loaded by the router.

**Major components:**
1. **TripStateService** — global signal-based state; single source of truth for the trip being built; auto-persists via effect() to LocalStorageService; all features read/write through it
2. **Feature modules (6x)** — flights, hotels, cars, transport, tours, attractions; each self-contained with search component, results component, ApiService, and Mapper; communicate only via TripStateService
3. **Mappers (per feature)** — pure functions: external API raw response → internal canonical model; the only code that knows external API schema; independently testable
4. **ItineraryModule** — read-only composition view; reads computed() signals from TripStateService; never calls APIs or mutates state
5. **SharedModule** — re-exports Angular Material modules + common UI components (search-card, result-card, loading-spinner, error-banner); prevents duplicated Material imports across 6 feature modules
6. **LocalStorageService** — safe wrapper around localStorage with try/catch and QuotaExceededError handling; only accessed via TripStateService, never directly from features
7. **Functional interceptors** — auth (API key injection), error normalization, loading state; registered in app.config.ts via withInterceptors()
8. **Cloudflare Worker proxy** — sits between Angular app and external APIs; holds real API keys as environment variables; validates Origin header to prevent public relay abuse

### Critical Pitfalls

1. **CORS blocking kills features at demo time** — Angular's dev proxy hides CORS during development; it does not exist in production builds. Test every API from a deployed static URL before writing service code. APIs that fail CORS need a Cloudflare Worker or Netlify Edge Function proxy immediately. Do this in Phase 1 before any integration work starts.

2. **API keys in the Angular bundle are publicly readable** — environment.ts is compiled into the JS bundle; anyone can find keys in DevTools. Use Cloudflare Worker proxy from day one for all paid APIs. Domain-restricted keys (e.g., Google Maps Platform) are acceptable for free-tier APIs with no billing. Never rely on obfuscation.

3. **forkJoin without per-observable catchError causes blank results** — if one of 6 APIs errors, forkJoin fails the entire observable and returns zero results. Apply `catchError(() => of({ source, error, data: [] }))` to each inner observable. Show partial results with per-source error banners. This is non-negotiable for an aggregator.

4. **localStorage QuotaExceededError silently corrupts trips** — the 5MB limit is reachable with rich itinerary data and cached API responses. Wrap all setItem calls in try/catch. Implement TTL-based cache eviction. Only persist essential fields, not full API response objects.

5. **Signals/RxJS hybrid creates memory leaks and stale state** — toSignal() called in components (not services) creates duplicate subscriptions. signal writes inside subscribe() callbacks break change detection. Define one canonical boundary project-wide before any feature is built: Observables in services, signals as state, zero subscriptions in components (use takeUntilDestroyed() for any remaining).

6. **Travel API rate limits exhaust under normal demo usage** — Amadeus free tier is 1 call/second. debounceTime(500) minimum on all search triggers. Exponential backoff on 429 responses. In-memory cache with 5-minute TTL to deduplicate identical queries.

---

## Implications for Roadmap

Based on research, the dependency graph is clear: state must exist before itinerary; shared components must exist before features; features can be built in parallel; itinerary view comes last because it reads from populated state. The proxy/CORS strategy must be validated before any API integration begins.

### Phase 1: Foundation and API Validation

**Rationale:** Everything depends on having a validated API strategy (CORS + key management) and a working state layer. Building features on top of an unknown API surface is the highest risk in this project. Phase 1 eliminates all architectural blockers before feature work begins.

**Delivers:**
- Angular project scaffold with app.config.ts, app.routes.ts, lazy route structure
- All internal canonical models (flight.model.ts, hotel.model.ts, car.model.ts, transport.model.ts, tour.model.ts, attraction.model.ts, itinerary.model.ts)
- Core services: LocalStorageService (with safe wrapper), ApiConfigService, TripStateService (signal-based, with effect() persistence)
- Functional interceptors: auth, error normalization, loading state
- SharedModule with Angular Material re-exports + common UI components (search-card, result-card, loading-spinner, error-banner)
- Cloudflare Worker proxy scaffold (or Netlify Edge Function) with Origin validation
- CORS validation report: every target API tested from a static production deploy; CORS status documented per API; proxy configured for blocked APIs
- API key strategy documented per API (domain-restricted vs. proxied)

**Addresses:** Trip state persistence (P1), mobile-responsive layout foundation (P1)
**Avoids:** CORS failure at deploy time (Critical Pitfall 1), API key exposure (Critical Pitfall 2), localStorage corruption (Critical Pitfall 4), Signals/RxJS memory leaks (Critical Pitfall 5)
**Research flag:** NEEDS RESEARCH — CORS status of each specific target API (Amadeus, Rome2rio, Viator, OpenTripMap) must be validated live against current developer portals. Training data CORS claims are LOW confidence.

### Phase 2: Core Itinerary Loop

**Rationale:** The itinerary is the primary product surface — the reason the app exists. Validating the itinerary UX before adding all 6 search categories ensures the core concept works before investing in API integrations. Manual item entry tests the state model without API complexity.

**Delivers:**
- Day-by-day itinerary view (ItineraryViewComponent reading TripStateService computed signals)
- Itinerary item component (display name, date, time, type, notes, remove action)
- Manual item add/edit/delete form
- LocalStorage persistence validated end-to-end (create trip → refresh → trip restored)
- Empty state, loading state, error state patterns established for reuse across features

**Addresses:** Day-by-day itinerary view (P1), manual item add/edit/delete (P1), trip state persistence (P1)
**Avoids:** Itinerary as afterthought — building it first confirms the state model is correct before 6 features write to it
**Research flag:** Standard Angular patterns — skip research-phase for this phase.

### Phase 3: Flight and Hotel Search

**Rationale:** Flights and hotels are the anchor search categories — highest user intent, most expected by users. Building both together establishes the full search-to-itinerary loop: search → results with sort/filter → add to itinerary → view in day timeline. This loop is the MVP value proposition. Once it works for flights and hotels, the pattern is proven and repeatable.

**Delivers:**
- FlightApiService + FlightMapper (Amadeus integration)
- HotelApiService + HotelMapper (Amadeus Hotels or Booking.com affiliate)
- Flight search component with form (origin, destination, dates, passengers, cabin class, trip type)
- Hotel search component with form (destination, check-in/out dates, rooms, guests)
- Shared results list component with sort (price, duration, rating) and filter (stops, price range, stars)
- "Add to itinerary" action connecting results to TripStateService
- Provider redirect links (target="_blank" rel="noopener noreferrer")
- Per-source loading and error states (not single global spinner)
- debounceTime on search triggers; catchError per observable; exponential backoff for 429

**Addresses:** Flight search (P1), hotel search (P1), sort/filter on results (P1), add result to itinerary (P1), provider redirect (P1)
**Avoids:** forkJoin without catchError (Critical Pitfall 3), rate limit exhaustion (Critical Pitfall 6), affiliate links opening in same tab
**Research flag:** NEEDS RESEARCH — Amadeus API rate limits, auth flow (client credentials — must be proxied), exact response schema for flight offers and hotel search. Validate against Amadeus developer portal.

### Phase 4: Car Rental and Intercity Transport Search

**Rationale:** Car rental completes the transport trio (flights + hotel + car) and reuses the exact same pattern established in Phase 3. Intercity transport (Rome2rio) is a genuine differentiator but requires validating Rome2rio's API availability, CORS status, and response schema. Both can be developed in parallel since they are independent features.

**Delivers:**
- CarApiService + CarMapper (RentalCars.com or Amadeus Cars)
- TransportApiService + TransportMapper (Rome2rio)
- Car rental search form (pick-up/drop-off location, dates/times, driver age)
- Intercity transport search form (origin city, destination city, date, passengers)
- Results display for both categories (reusing shared result-card component)
- Add to itinerary + provider redirect for both

**Addresses:** Car rental search (P1), intercity transport search (P2)
**Research flag:** NEEDS RESEARCH — Rome2rio API access (public API availability has changed; verify current status). Car rental API choice depends on CORS validation from Phase 1.

### Phase 5: Tours, Activities, and Attractions

**Rationale:** These categories complete the "what to do" layer and are genuinely differentiating. Tours and activities (Viator) have a booking redirect; attractions (OpenTripMap) are browse-and-add with no booking flow. Both are most valuable when the user has destination context from their itinerary — this is the seed of contextual search, which becomes fully featured in v2.

**Delivers:**
- TourApiService + TourMapper (Viator)
- AttractionApiService + AttractionMapper (OpenTripMap or Foursquare)
- Tours search form (destination + date)
- Attractions browse by city
- Results display for both (no booking redirect for attractions — just "add to itinerary")
- Category filter for tours (walking tour, day trip, food tour, etc.)

**Addresses:** Tours search (P2), attractions/POI search (P2)
**Research flag:** NEEDS RESEARCH — Viator partner API access requirements, rate limits, and CORS. OpenTripMap free tier limits. Both must be validated before building service layer.

### Phase 6: Polish and Shareable Link

**Rationale:** With all 6 search categories working and the itinerary loop proven, this phase adds the polish features that make the product feel complete and shareable. Drag-and-drop reordering and the shareable link are both frontend-only features with no new API dependencies.

**Delivers:**
- Drag-and-drop itinerary reordering (Angular CDK DragDrop)
- Shareable trip link (URL-safe base64 encoding of localStorage trip state; no backend)
- Search form state persisted in URL query params (restore on navigation back)
- Bundle optimization audit (map libraries lazy-loaded, route-level code splitting verified)
- Content Security Policy headers configured at Netlify level
- "Prices from X minutes ago" timestamp + refresh button on results
- CORS proxy Origin validation hardened

**Addresses:** Drag-and-drop reordering (P2), shareable trip link (P2)
**Avoids:** Search state lost on navigation, missing bundle optimization, missing CSP
**Research flag:** Standard Angular CDK and URL encoding patterns — skip research-phase.

### Phase Ordering Rationale

- **Foundation before features:** TripStateService and the proxy strategy must exist before any API integration. Building features on an unvalidated API surface wastes effort.
- **Itinerary before search:** The state model must be proven correct with manual data before 6 features write to it. Discovering state model bugs after building 6 features is expensive.
- **Flights/hotels first:** These are the anchor categories. Proving the search-to-itinerary loop with the most expected categories validates the core product value before investing in differentiating categories.
- **Cars/transport parallel:** Independent features, same pattern; can be built concurrently with flights/hotels if resources allow.
- **Tours/attractions after transport:** These need destination context that comes naturally after flights/hotels are in the itinerary. Also, Viator API access requires validation that may take time.
- **Polish last:** Drag-and-drop and shareable link are enhancements to a working product, not foundations.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** CORS status and auth flow for every target API (Amadeus, Rome2rio, Viator, OpenTripMap, car rental API). PITFALLS.md rates this LOW confidence — training data CORS claims must be validated live.
- **Phase 3:** Amadeus API specifics: client credentials flow details, flight offer search v2 schema, hotel search endpoint, rate limits per tier. This is the highest-integration-complexity phase.
- **Phase 4:** Rome2rio API current availability and access model. This has changed historically and needs live validation.
- **Phase 5:** Viator partner API requirements — this may require a partnership application with lead time.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Angular signals, localStorage, itinerary component patterns — well-documented, stable.
- **Phase 6:** Angular CDK DragDrop, URL encoding — standard, well-documented patterns.

---

## Consensus Across Research Files

All four research files agree on these points without conflict:

1. **Angular Signals for state, no NgRx** — all files reference signal-based TripStateService as the correct pattern; NgRx is not mentioned as needed
2. **Proxy is mandatory, not optional** — STACK.md includes Cloudflare Workers in the stack summary; ARCHITECTURE.md calls it out as the first scaling concern; PITFALLS.md makes it a critical pitfall
3. **Mapper pattern is essential** — ARCHITECTURE.md defines the ApiService + Mapper boundary; PITFALLS.md flags storing raw API types in state as an anti-pattern; both agree on internal canonical models
4. **No authentication in v1** — PROJECT.md, FEATURES.md, and ARCHITECTURE.md all align on localStorage as the persistence layer and no-login as a constraint and differentiator
5. **Lazy loading for all 6 feature routes** — ARCHITECTURE.md anti-pattern 5, PITFALLS.md performance traps, STACK.md all flag eager loading as wrong
6. **Per-source error isolation** — ARCHITECTURE.md data flow, PITFALLS.md Critical Pitfall 3, FEATURES.md differentiators all point toward per-source loading and error states

## Key Decisions Surfaced

These decisions must be confirmed before Phase 1 implementation:

| Decision | Options | Recommended | Risk if Wrong |
|----------|---------|-------------|---------------|
| Flight API | Amadeus vs. Duffel vs. Skyscanner | Amadeus (free test tier, official SDK) | CORS or rate limit mismatch discovered mid-build |
| Hotel API | Amadeus Hotels vs. Booking.com affiliate | Amadeus Hotels (same auth as flights) | Affiliate program approval time; CORS blocked |
| Car rental API | Amadeus Cars vs. RentalCars.com | Validate CORS in Phase 1; prefer same provider as flights/hotels for auth simplicity | Different auth per provider adds interceptor complexity |
| Intercity transport API | Rome2rio vs. Google Maps Routes | Rome2rio (purpose-built for this) | Rome2rio API access changed; may need to fall back to Omio or manual links |
| Tours API | Viator vs. GetYourGuide | Viator (larger inventory) | Partnership application may have lead time |
| Attractions API | OpenTripMap vs. Foursquare vs. Google Places | OpenTripMap (free, no billing) | Data quality and coverage per destination |
| Proxy platform | Cloudflare Workers vs. Netlify Edge Functions | Cloudflare Workers (zero cold start, free tier generous) | Either works; Netlify is simpler if already hosting there |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (Angular choices) | HIGH | Angular 17+ standalone components, signals, functional interceptors — stable APIs in training data through Jan 2025 |
| Stack (API choices) | MEDIUM-LOW | API tiers, CORS policies, and access models change frequently; all API choices need live validation before Phase 1 |
| Features | MEDIUM | Competitor feature sets are stable and well-documented; no live verification of current competitor UI was possible |
| Architecture | MEDIUM | Angular patterns are well-established; the specific pattern combinations (signals + interceptors + mappers) are standard community practice |
| Pitfalls | MEDIUM-HIGH | Browser security fundamentals (CORS, localStorage limits, key exposure) are HIGH confidence; travel-API-specific CORS claims are LOW confidence |

**Overall confidence:** MEDIUM

### Gaps to Address

- **API CORS validation (Phase 1 blocker):** Training data cannot confirm current CORS headers for Amadeus, Rome2rio, Viator, or OpenTripMap. Must test with curl from a production-equivalent environment before writing any service code.
- **Viator partner API access:** May require application and approval. Investigate lead time early — if 2+ weeks, start the application before Phase 5 begins.
- **Angular 18/19 idiom changes:** Training data through Jan 2025 covers Angular 17 confidently. Angular 18 introduced `@if`/`@for` control flow as stable; Angular 19 may have additional signal input (`input()`) patterns. Verify against angular.dev before starting implementation.
- **Rome2rio API current access model:** This has changed historically. Verify on developer portal — may require a different fallback (Omio, Distribusion, or manual external links for transport).
- **localStorage 5MB ceiling with real data:** Test early with realistic itinerary data (multiple destinations, full API response objects) to confirm the safe-storage wrapper and serialization approach are sufficient before Phase 3.

---

## Sources

### Primary (HIGH confidence)
- Browser Web Storage spec (MDN, WHATWG) — localStorage 5MB quota, QuotaExceededError
- RxJS official documentation — forkJoin completion semantics, catchError behavior
- Angular CLI official documentation — dev proxy behavior, build output characteristics

### Secondary (MEDIUM confidence)
- Angular 17 official documentation (angular.dev, training knowledge) — standalone components, signals API, functional interceptors, inject(), takeUntilDestroyed()
- Angular Material 3 — component library, responsive layout
- TripIt, Kayak Trips, Wanderlog, Rome2rio, Viator, Hopper, Skyscanner feature sets — training knowledge, competitor analysis
- Cloudflare Workers documentation — proxy pattern, Origin validation

### Tertiary (LOW confidence, validate before use)
- Amadeus API CORS headers and rate limits — training data only; validate at amadeus.com/en/developers
- Rome2rio API current access model — training data only; validate at rome2rio.com/documentation
- Viator partner API access requirements — training data only; validate at viator.com/partner-api
- Booking.com affiliate API CORS support — training data only; validate with affiliate program

---

*Research completed: 2026-02-11*
*Ready for roadmap: yes*
