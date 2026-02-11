# Technology Stack: Triply

**Project:** Triply — Angular 17+ Travel Planning Aggregator
**Researched:** 2026-02-11
**Confidence:** MEDIUM overall — Angular framework choices are HIGH confidence (stable official APIs, training data through Jan 2025). Travel API choices are MEDIUM-LOW confidence (validate all API choices against current developer portals before Phase 1).

---

## Stack Summary (One-liner)

Angular 19 + Angular Material 3 + hand-rolled Signals store (NgRx Signals Store as upgrade path) + RxJS + Amadeus (flights/hotels) + Rome2rio (transport) + Viator (activities) + OpenTripMap (attractions) + Cloudflare Workers as API proxy + Netlify hosting.

---

## Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Angular | 19.x | SPA framework | Project constraint. Angular 17+ introduced stable signals, standalone components, and functional interceptors. Use Angular 19 for stable input()/output() signal inputs, @defer blocks for progressive loading, and @let template variables. |
| TypeScript | 5.5+ (bundled) | Static typing | Strict mode required. Catches mapper type errors, undefined API fields, and signal misuse at compile time. |
| Angular CLI | 19.x | Build, scaffold, serve, test | Standard Angular toolchain. Do not eject webpack. |

**Confidence:** HIGH — Angular 17-19 is the project constraint.

---
## UI Library

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Angular Material | 19.x (MDC-based) | Component library, design system | Project constraint. MDC renderer is the default since Angular Material 15. Provides: mat-card, mat-button, mat-form-field, mat-date-range-input, mat-select, mat-tab-group, mat-progress-bar, mat-snack-bar, mat-dialog, mat-expansion-panel. Zero custom component work needed for v1. |
| Angular CDK | 19.x (bundled) | Headless UI utilities | Required by Angular Material. Use DragDropModule for itinerary reordering (v1.x) and VirtualScrollViewport for result lists over 50 items. |

Do NOT add PrimeNG, Ng-Zorro, or Tailwind as replacements — Angular Material is the project constraint.

**Confidence:** HIGH — Angular Material is a project constraint.

---

## State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Angular Signals (built-in) | Stable since Angular 16 | Component state, computed() derived values, effect() for persistence | No external library needed for v1. The hand-rolled signal service pattern uses signal(), computed(), and effect() natively. |
| NgRx Signals Store (@ngrx/signals) | 19.x | Structured global store — upgrade path only | NOT for v1 MVP. Add if trip state grows beyond ~10 signals or DevTools debugging is needed. |

**Decision: Hand-rolled signal service for v1. Migrate to NgRx Signals Store if complexity grows.**

NOT recommended:
- Classic NgRx (Actions/Reducers/Effects/Selectors): Overkill for a no-backend localStorage app.
- NGXS: Less community momentum than NgRx Signals Store in 2025.
- Akita: Not maintained.

**Confidence:** HIGH for rejecting classic NgRx. MEDIUM for hand-rolled-first approach.

---

## HTTP Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Angular HttpClient (@angular/common/http) | Built-in | All external API calls | The only correct HTTP client for Angular. Integrates with the interceptor pipeline. Do NOT use fetch() directly or axios — they bypass interceptors entirely. |
| RxJS | 7.x (bundled) | Observable-based async composition | HttpClient returns Observables. Use forkJoin with per-observable catchError, debounceTime, switchMap, retry, tap, finalize. Import operators individually. |

**app.config.ts pattern:**
```typescript
import { provideHttpClient, withInterceptors, withFetch } from "@angular/common/http";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor, loadingInterceptor]),
      withFetch()  // Available in Angular 17.3+; improves streaming response handling
    )
  ]
};
```

**Confidence:** HIGH.

---
## Forms

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Angular Reactive Forms (@angular/forms) | Built-in | All search forms | Reactive Forms are mandatory for travel search forms. They handle: cross-field validation (check-in before check-out), dynamic form groups (multi-city legs), programmatic updates from URL state. Template-driven forms cannot handle these reliably. |

Use typed FormGroup with nonNullable: true on string fields for correct TypeScript inference on form.value.

Do NOT use ngModel or Template-driven forms for any of the 6 complex search forms.

**Confidence:** HIGH.

---

## Routing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Angular Router (@angular/router) | Built-in | SPA navigation, lazy loading feature routes | Lazy-load all 6 feature routes plus itinerary builder. Use loadComponent (not loadChildren with a module) for standalone components — direct, no wrapper route config needed. |

Use withComponentInputBinding() in provideRouter() to bind route parameters to component input() signal fields.

**Confidence:** HIGH.

---

## Persistence Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Browser localStorage | Built-in web API | Persist trip itinerary across sessions | Correct for v1 (no login, no backend). Wrap ALL access in LocalStorageService with try/catch for QuotaExceededError. Never call localStorage.setItem directly in components. |
| lz-string | ^1.5 | Compress localStorage data | Travel app itinerary can approach the 5MB limit. LZ-string compresses JSON 60-70%. Use in LocalStorageService for the itinerary payload specifically. |

What NOT to use:
- IndexedDB directly: Verbose callback API. Upgrade path: use the idb library wrapper if localStorage is insufficient.
- sessionStorage: Does not persist across browser restarts.
- Cookies: Size-limited to 4KB. Wrong tool.

**Confidence:** HIGH for localStorage. MEDIUM for lz-string (depends on actual data volume).

---

## Travel API Selections

**CRITICAL: All API choices are MEDIUM-LOW confidence. Validate against current developer portals before starting Phase 1. API tiers, pricing, and CORS policies change without notice.**

### Category 1: Flights

**Recommended: Amadeus for Developers (test environment)**

| Property | Value |
|----------|-------|
| API | Amadeus for Developers |
| Base URL (test) | https://test.api.amadeus.com/v2/ |
| Free tier | Test environment: unlimited calls against synthetic data |
| Auth | OAuth 2.0 Client Credentials (client_id + client_secret) |
| Key endpoint | GET /shopping/flight-offers |
| CORS status | BLOCKED — requires proxy (client_secret must not appear in browser) |
| Docs | https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-search |

Why Amadeus over alternatives:
- **Skyscanner:** Closed public API in 2020. Partner-only via RapidAPI with strict usage limits.
- **Google Flights:** No public API. Do not scrape — Terms of Service violation.
- **Duffel:** Targets travel agencies doing NDC bookings; not for search-only redirect aggregators.
- **Kiwi (tequila.kiwi.com):** Free public search API but rate limits are opaque and reliability is inconsistent.
- **Amadeus advantage:** Free test environment with synthetic data. Simple key registration. Good docs. OAuth client_secret handled by Cloudflare Worker proxy.

**Confidence:** MEDIUM.

---
### Category 2: Hotels

**Recommended: Amadeus Hotel Search (same API account as flights)**

| Property | Value |
|----------|-------|
| API | Amadeus for Developers — Hotel Search |
| Key endpoints | GET /reference-data/locations/hotels/by-city, GET /shopping/hotel-offers |
| Free tier | Covered by same Amadeus test account as flights |
| CORS status | BLOCKED — same proxy as flights |
| Docs | https://developers.amadeus.com/self-service/category/hotels/api-doc/hotel-search |

Why Amadeus Hotels over alternatives:
- **Booking.com Affiliate API:** Requires manual partner approval with an existing website. Not immediately accessible.
- **Hotels.com / Expedia Rapid API:** Partner-only; commercial agreement required.
- **Amadeus advantage:** One account covers flights and hotels. One proxy worker. Simpler architecture for v1.

**Confidence:** MEDIUM. Hotel inventory may be less comprehensive than Booking.com — acceptable for v1.

---

### Category 3: Car Rental

**Recommended: Redirect pattern for v1 (no dedicated API)**

Car rental APIs are the weakest category in the travel API ecosystem. Amadeus Transfer API covers airport transfers only (not per-day rental). Booking.com and RentalCars require partner agreements.

v1 approach — show a search form and deep-link with pre-filled URL parameters:
```
https://www.rentalcars.com/en/?affiliateCode=YOUR_CODE&prefloc=LOCATION&prefsdate=YYYY-MM-DD&prefedate=YYYY-MM-DD
```

If a real API is required later: RentalCars via RapidAPI. Validate CORS and free tier before committing. Likely requires proxy.

**Confidence:** LOW for dedicated car rental APIs. Redirect pattern is the safe v1 fallback.

---

### Category 4: Intercity Transport (Trains / Buses)

**Recommended: Rome2rio API**

| Property | Value |
|----------|-------|
| API | Rome2rio API |
| Base URL | https://free.rome2rio.com/api/1.5/json/Search |
| Free tier | 1,000 requests/day |
| Auth | API key as query parameter (key=YOUR_KEY) |
| CORS status | LIKELY ALLOWED on free tier — verify before skipping proxy |
| Docs | https://www.rome2rio.com/documentation/api/ |

Why Rome2rio:
- Authoritative source for multi-modal transport routing (bus + train + ferry + drive). No competitor matches global coverage.
- The free tier potentially permits browser-side calls — the only major travel API that may not require a proxy.
- **FlixBus API:** Bus-only, European coverage only. Too narrow.
- **Omio:** No public API.
- **Trainline:** Region-specific (Europe), no public API.

**Confidence:** MEDIUM. Verify CORS headers before assuming proxy can be skipped.

---

### Category 5: Tours and Activities

**Recommended: Viator Partner API**

| Property | Value |
|----------|-------|
| API | Viator Partner API (via TripAdvisor/Viator) |
| Registration | https://partnerresources.viator.com/travel-commerce/affiliate/programs/affiliate-program/ |
| Auth | API key header |
| CORS status | Likely requires proxy — verify at registration |
| Alternative | GetYourGuide Partner API |

Why Viator:
- Largest global experiences and activities inventory.
- Affiliate program aligns with Triply future monetization model.
- **GetYourGuide:** Also has a partner API with strong inventory. Either is valid; Viator recommended for broader global coverage.
- **Klook:** Strong in Asia-Pacific markets only.
- **MagicAPI / RapidAPI activity APIs:** Lower quality, inconsistent inventory, ToS exposure. Avoid.

IMPORTANT: Both Viator and GetYourGuide require manual affiliate program approval. Do NOT begin development on this category until API access is confirmed. For v1 MVP, use redirect:
```
https://www.viator.com/searchResults/all?text=DESTINATION&startDate=YYYY-MM-DD
```

**Confidence:** MEDIUM for Viator as the correct choice. LOW for development timeline — approval is manual.

---

### Category 6: Tourist Attractions / Points of Interest

**Recommended: OpenTripMap API**

| Property | Value |
|----------|-------|
| API | OpenTripMap |
| Base URL | https://api.opentripmap.com/0.1/en/ |
| Free tier | 500 requests/day |
| Auth | API key as query parameter |
| CORS status | LIKELY ALLOWED — verify before implementation |
| Key endpoints | GET /places/radius (POIs near coordinates), GET /places/xid/{xid} (place details) |
| Docs | https://opentripmap.io/docs |

Why OpenTripMap over alternatives:
- **Google Places API:** No meaningful free tier after initial credit expires. Per-call pricing ($17/1000 requests) is unpredictable for a no-login app with many searches.
- **Foursquare Places:** Strong free tier (100K calls/month). Valid alternative and the preferred upgrade path if OpenTripMap data quality is insufficient.
- **OpenTripMap advantage:** Completely free up to 500 req/day, no billing setup, browser-callable. Correct trade-off for v1.

Upgrade path: OpenTripMap (v1) -> Foursquare Places (v1.x) -> Google Places (v2 with proxy if scale justifies cost).

**Confidence:** MEDIUM.

---
## API Key Management Strategy

### Key Classification

| API | Sensitivity | Strategy |
|-----|-------------|----------|
| Amadeus (flights + hotels) | HIGH — OAuth client_secret; billing fraud risk | Cloudflare Worker proxy — key stored as Worker environment variable |
| Car rental API (if added) | HIGH | Cloudflare Worker proxy |
| Rome2rio | LOW — free tier, no billing attached | environment.ts acceptable; domain-restrict at provider if option exists |
| Viator | MEDIUM — affiliate commission at risk if key abused | Cloudflare Worker proxy |
| OpenTripMap | LOW — free tier, daily limit enforces natural abuse ceiling | environment.ts acceptable for v1 |

### Cloudflare Workers Proxy Pattern

The Worker acts as a CORS-enabling, key-hiding proxy:
1. Receives request from Angular app
2. Validates the Origin header (whitelist your domain — do NOT allow all origins)
3. Attaches the real API key server-side
4. Forwards to the travel API
5. Returns response with correct Access-Control-Allow-Origin header

**environment.ts (Angular side):**
```typescript
export const environment = {
  production: false,
  apis: {
    // High-sensitivity APIs: Angular calls the Worker URL, not the real API
    amadeus: "https://YOUR-WORKER.YOUR-ACCOUNT.workers.dev/amadeus",
    viator: "https://YOUR-WORKER.YOUR-ACCOUNT.workers.dev/viator",
    // Low-sensitivity: direct calls if CORS is confirmed
    rome2rio: "https://free.rome2rio.com/api/1.5/json",
    rome2rioKey: "YOUR_FREE_KEY",
    opentripmap: "https://api.opentripmap.com/0.1/en",
    openTripmapKey: "YOUR_FREE_KEY",
  }
};
```

Use Angular dev proxy (proxy.conf.json) for local development only. The dev proxy does not exist in the built output — it is not a production solution.

Alternative to Cloudflare Workers: Netlify Edge Functions if hosting on Netlify. Either achieves the same result.

**Confidence:** HIGH for the proxy requirement on Amadeus. MEDIUM for Cloudflare Workers specifically.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^3.x | Date manipulation, formatting for API parameters | Required. Travel date calculations: duration, date range overlaps, formatting as YYYY-MM-DD for API calls. Import only functions used — date-fns is tree-shakeable per function. |
| @angular/material-date-fns-adapter | 19.x | Connect Material date pickers to date-fns | Required alongside date-fns when using mat-date-range-input. Without this, Material date pickers use native Date objects that are hard to format consistently for API parameters. |
| lz-string | ^1.5 | Compress localStorage data | Use in LocalStorageService for the itinerary payload. Add before production when data volume is known. |
| @angular/cdk | 19.x (bundled with Material) | Drag-and-drop, virtual scrolling | Already installed with Angular Material. DragDropModule for itinerary reordering (v1.x). VirtualScrollViewport for result lists over 50 items. |

### Libraries Explicitly NOT Recommended

| Library | Why Not |
|---------|---------|
| Moment.js | Deprecated by its own maintainers. Bundles all locales (287KB unminified). Use date-fns. |
| Lodash (full package) | No justification for this app. Native JS covers the data operations needed here. If truly needed, import individual functions only. |
| Axios | Bypasses Angular HttpClient interceptor pipeline. Never use in an Angular application. |
| ng2-charts / Chart.js | Not needed in v1. Add in v2 if price comparison charts are built. |
| ngx-translate | Not needed in v1 (no i18n requirement in scope). |
| jQuery | No use case in Angular 17+. |
| ngx-spinner | Overkill. Angular Material mat-progress-bar and mat-progress-spinner cover all loading state needs. |

**Confidence:** HIGH for date-fns choice and rejecting Moment.js.

---
## Testing Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Jasmine | Bundled with Angular CLI | Unit tests | Default Angular test framework. Sufficient for mapper unit tests, service tests, and utility functions. |
| Karma | Bundled with Angular CLI | Browser test runner | Default Angular runner. Note: Angular 17+ is deprecating Karma — Karma still works for v1 and is the path of least resistance. |
| Angular TestBed | Built-in | Component integration tests | Use for component tests requiring Angular DI. |

Testing priorities for this project (in order of value):
1. Mapper unit tests — pure functions, trivial to test, high value for API integration correctness
2. LocalStorageService with QuotaExceededError simulation
3. TripStateService signal behavior (select, clear, hydrate from storage)
4. API service tests with HttpClientTestingModule

Defer E2E tests (Cypress/Playwright) until itinerary builder is stable in v1.x.

**Confidence:** MEDIUM — Angular testing ecosystem is in flux; Karma deprecation timeline unresolved.

---

## Build and Hosting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Angular CLI ng build | 19.x | Production build | Tree-shaking, code splitting, lazy chunk generation per route. Feature routes become separate chunks — critical for initial load performance. |
| Netlify | Current | Static hosting + Edge Functions | Free tier covers portfolio apps. Edge Functions can serve as API proxy alternative to Cloudflare Workers. Automatic deploys from Git. _headers file for CSP. |
| Cloudflare Workers | Free tier | API key proxy | 100K requests/day on free tier. ~50 lines of JS per worker. Required unless using Netlify Edge Functions. |

CSP configuration (_headers file for Netlify):
```
/*
  Content-Security-Policy: default-src self; script-src self; connect-src self https://*.workers.dev https://free.rome2rio.com https://api.opentripmap.com; img-src self data: https:; style-src self unsafe-inline https://fonts.googleapis.com; font-src self https://fonts.gstatic.com;
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

**Confidence:** HIGH for Angular CLI build. MEDIUM for Netlify (Vercel is equally valid).

---
## Angular-Specific Patterns Summary

All new code in this project must follow these Angular 17-19 idiomatic patterns.

### Standalone Components (Default in Angular 17+)

```typescript
@Component({
  selector: "app-flight-search",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatProgressBarModule,
  ],
  templateUrl: "./flight-search.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearchComponent { ... }
```

Always use ChangeDetectionStrategy.OnPush with signals. Signals automatically notify Angular scheduler; OnPush prevents unnecessary re-renders between signal updates.

### Signal Inputs and Outputs (Angular 17.1+)

```typescript
import { input, output } from "@angular/core";

export class ResultCardComponent {
  flight = input.required<Flight>();
  currency = input<string>("USD");
  selectFlight = output<Flight>();
}
```

Use input() and output() for all new components. @Input() and @Output() decorators still work but are the legacy pattern.

### inject() Function (No Constructor Parameter DI)

```typescript
@Injectable({ providedIn: "root" })
export class FlightApiService {
  private http = inject(HttpClient);
  private config = inject(ApiConfigService);
}
```

### New Control Flow Syntax (Angular 17+)

```html
@if (isLoading()) {
  <mat-progress-bar mode="indeterminate" />
} @else if (flights().length === 0) {
  <app-empty-state message="No flights found" />
} @else {
  @for (flight of flights(); track flight.id) {
    <app-flight-card [flight]="flight" (select)="onSelect($event)" />
  }
}

@defer (on viewport) {
  <app-heavy-map [destination]="destination()" />
} @placeholder {
  <div class="map-placeholder">Loading map...</div>
}
```

Do NOT use *ngIf, *ngFor, *ngSwitch in new components. The new @if, @for, @switch, @defer syntax is stable in Angular 17 and performs better.

### toSignal() for Observable-to-Signal Bridge

```typescript
flights = toSignal(
  toObservable(this.searchParams).pipe(
    debounceTime(300),
    switchMap(params => this.flightApi.searchFlights(params).pipe(
      catchError(() => of([] as Flight[]))
    ))
  ),
  { initialValue: [] as Flight[] }
);
```

**Confidence:** HIGH — all patterns above were stable in Angular 17 (November 2023). Signal inputs stable in Angular 17.1. @defer stable in Angular 17. All documented at angular.dev.

---
## Alternatives Considered

| Category | Recommended | Rejected Alternative | Why Rejected |
|----------|-------------|---------------------|--------------|
| Angular version | Angular 19 | Stay on Angular 17 | Angular 19 has stable input()/output(), @let template variables, improved hydration. No reason to use 17 on greenfield in 2026. |
| State management | Hand-rolled signals | Classic NgRx | Overkill for a no-backend localStorage app. Actions/Reducers/Effects/Selectors add ceremony without value here. |
| State management | Hand-rolled signals (v1) | NgRx Signals Store | Right upgrade path, but adds dependency before complexity justifies it. |
| HTTP | Angular HttpClient | Axios | Bypasses Angular interceptor pipeline. |
| Dates | date-fns | Moment.js | Deprecated. 287KB. Dead ecosystem. |
| Dates | date-fns | Luxon | Less tree-shakeable; date-fns is the 2025 Angular community standard. |
| Flights | Amadeus | Skyscanner | Public API closed in 2020. |
| Hotels | Amadeus | Booking.com Affiliate | Requires manual partner approval; not immediately accessible. |
| Cars | Redirect pattern | Amadeus Transfer API | Amadeus covers airport transfers only, not per-day rental. |
| Attractions | OpenTripMap | Google Places | No meaningful free tier; per-call cost unpredictable for a no-login app. |
| Attractions | OpenTripMap | Foursquare Places | Both valid. OpenTripMap has a fully free tier. Foursquare is the upgrade path. |
| Hosting | Netlify | GitHub Pages | No edge function support for API proxy. |
| Control flow | @if / @for (Angular 17+) | *ngIf / *ngFor | Legacy structural directives. |

---

## Installation

```bash
# 1. Create Angular 19 project with standalone defaults
ng new triply --standalone --routing --style=scss

# 2. Add Angular Material (select theme interactively)
ng add @angular/material
# Recommended: Custom theme, Yes to typography, Yes to animations

# 3. Date-fns and Material date adapter
npm install date-fns @angular/material-date-fns-adapter

# 4. Storage compression (add before production)
npm install lz-string
npm install --save-dev @types/lz-string

# 5. NgRx Signals Store (defer — do NOT install in Phase 1)
# npm install @ngrx/signals
```

ng add @angular/material automatically adds provideAnimations() to app.config.ts, links the Material theme in angular.json, and installs @angular/cdk. Do not install these manually.

---

## Required Project Configuration

**tsconfig.json — all strict flags required:**
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

**angular.json — production bundle budget:**
```json
{
  "budgets": [
    { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
    { "type": "anyComponentStyle", "maximumWarning": "2kb", "maximumError": "4kb" }
  ]
}
```

The 500kb initial budget is achievable with lazy-loaded feature routes and no map library in the main chunk.
If it triggers: audit with ng build --stats-json then npx webpack-bundle-analyzer dist/triply/stats.json.

---

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| Angular 17-19 official docs (angular.dev) | MEDIUM | Training data through Jan 2025; verify at angular.dev |
| Angular Material docs (material.angular.io) | MEDIUM | MDC migration complete in Angular Material 15+ |
| Amadeus for Developers | MEDIUM | Verify free tier at https://developers.amadeus.com |
| Rome2rio API | MEDIUM | Verify CORS status at https://www.rome2rio.com/documentation/api/ |
| OpenTripMap | MEDIUM | Verify free tier at https://opentripmap.io/docs |
| Viator Partner Program | LOW | Manual approval required; verify at https://partnerresources.viator.com |
| Skyscanner API | MEDIUM | Public API confirmed closed in 2020 |
| date-fns v3 | MEDIUM | Tree-shakeable per function; verify current version on npm |
| Cloudflare Workers free tier | MEDIUM | 100K req/day; verify at https://developers.cloudflare.com/workers/platform/limits/ |
| NgRx Signals Store | MEDIUM | Released with NgRx 17 (2023); verify at https://ngrx.io/guide/signals |

---

*Stack research for: Triply — Angular 17+ Travel Planning Aggregator*
*Researched: 2026-02-11*
*IMPORTANT: WebSearch and WebFetch were unavailable during this research session. All findings are based on training data through January 2025. Travel API availability, pricing tiers, and CORS policies change frequently. Verify all API choices against current developer portals before Phase 1 implementation begins.*