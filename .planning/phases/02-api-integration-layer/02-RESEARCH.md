# Phase 2: API Integration Layer - Research

**Researched:** 2026-02-11
**Domain:** Angular 21 HttpClient, functional interceptors, CORS proxy strategy, API key security, RxJS error/retry patterns, ApiService + Mapper architecture
**Confidence:** MEDIUM-HIGH (Angular HTTP patterns: HIGH; CORS status for target APIs: LOW — requires live validation)

---

## Summary

Phase 2 builds the HTTP plumbing that all feature phases (4–9) depend on. The Angular 21 ecosystem has a clear, stable approach: `provideHttpClient(withInterceptors([...]))` is the canonical registration, functional interceptors using `inject()` replace class-based interceptors, and the `HttpContextToken` mechanism enables per-request configuration without coupling interceptors to request bodies. All of this is well-documented in official Angular docs.

The three hardest problems in this phase are CORS strategy, API key security, and retry logic. For CORS, the Angular CLI dev proxy (`proxy.conf.json`) handles development completely, but production requires a real server-side proxy for APIs that do not emit CORS headers — Amadeus is confirmed server-side-only (OAuth2 client credentials grant, API secret must never be exposed in the browser), and Viator, OpenTripMap, and Rome2rio CORS status must be validated live. For API key security, the invariant is simple: no API key or secret may appear in the Angular bundle. The Amadeus `amadeusApiSecret` makes this mandatory from day one — the proxy is the only valid production solution. For retry, `retryWhen` is deprecated in RxJS 7; the modern `retry({ count, delay })` operator handles 429 with exponential backoff cleanly.

The architecture follows a strict layering: each feature gets its own `XxxApiService` that extends or composes a typed base, an `XxxMapper` that translates external schemas to internal canonical types, and the whole thing is provided as a standalone service injectable in isolation. Feature modules never call `HttpClient` directly.

**Primary recommendation:** Add `provideHttpClient(withFetch(), withInterceptors([apiKeyInterceptor, errorInterceptor, loadingInterceptor]))` to `app.config.ts`, configure `proxy.conf.json` + `angular.json` proxyConfig for dev, deploy a Cloudflare Worker CORS proxy for production, define canonical model base types, then build one complete feature service (flights/Amadeus) as the reference implementation before scaffolding the others.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@angular/common/http` | 21.x (bundled) | HttpClient, interceptors, HTTP primitives | Bundled with Angular; `provideHttpClient()` is the canonical DI entry point |
| `rxjs` | 7.x (bundled) | Observable operators: `retry`, `catchError`, `debounceTime`, `switchMap`, `finalize` | Bundled with Angular; `retry({ count, delay })` is the modern non-deprecated backoff API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `backoff-rxjs` | 6.x | `retryBackoff()` operator with configurable exponential backoff | When more control over backoff strategy is needed than `retry({ delay })` provides; optional |

### NOT Required (avoid)
| Library | Reason to Avoid |
|---------|-----------------|
| `@ngrx/store` | Project decision: Angular Signals for state, no NgRx |
| `axios` | `HttpClient` + interceptors covers all needs; mixing HTTP clients splits the interceptor chain |
| Class-based interceptors (`HttpInterceptor` interface) | Functional interceptors are the Angular 15+ standard; class-based still works but has less predictable ordering |

**Installation:**
```bash
# No new npm packages needed for core HTTP — it is bundled with Angular.
# Optional, only if retryBackoff is chosen over native retry():
npm install backoff-rxjs
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   ├── api/
│   │   ├── api.service.ts              # Base typed HttpClient wrapper (optional thin abstraction)
│   │   ├── api-config.service.ts       # Centralized key management + endpoint registry
│   │   ├── interceptors/
│   │   │   ├── api-key.interceptor.ts  # Functional: injects API key per-request via HttpContextToken
│   │   │   ├── error.interceptor.ts    # Functional: normalizes all errors to AppError shape
│   │   │   └── loading.interceptor.ts  # Functional: sets/clears loading signal
│   │   └── models/
│   │       └── app-error.model.ts      # Canonical error shape
│   └── models/                         # Shared canonical domain types (Flight, Hotel, Car, etc.)
│       ├── flight.model.ts
│       ├── hotel.model.ts
│       └── ...
├── features/
│   ├── search/                         # Feature placeholder (Phase 1 output)
│   │   ├── api/
│   │   │   ├── flights-api.service.ts  # Extends/composes ApiService, calls Amadeus
│   │   │   └── flights.mapper.ts       # Transforms Amadeus response → Flight canonical model
│   │   └── ...
│   └── ...
```

### Pattern 1: provideHttpClient with Functional Interceptors
**What:** Register `HttpClient` + all interceptors once in `app.config.ts`. Use `withFetch()` for modern Fetch API support, `withInterceptors([...])` for the chain.
**When to use:** Every Angular 19+ standalone project.

```typescript
// Source: angular.dev/guide/http/setup
// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { apiKeyInterceptor } from './core/api/interceptors/api-key.interceptor';
import { errorInterceptor } from './core/api/interceptors/error.interceptor';
import { loadingInterceptor } from './core/api/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        apiKeyInterceptor,   // runs first — injects keys
        errorInterceptor,    // runs second — normalizes errors
        loadingInterceptor,  // runs third — manages loading state
      ]),
    ),
  ],
};
```

### Pattern 2: Functional Interceptor with inject()
**What:** A pure function `(req, next) => Observable` that uses `inject()` to read services/tokens.
**When to use:** All interceptors in this project — functional interceptors have predictable ordering and are the Angular 15+ standard.

```typescript
// Source: angular.dev/guide/http/interceptors
// src/app/core/api/interceptors/api-key.interceptor.ts
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiConfigService } from '../api-config.service';

// Per-request token: callers set this to identify which API key to inject
export const API_SOURCE = new HttpContextToken<string | null>(() => null);

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiConfig = inject(ApiConfigService);
  const source = req.context.get(API_SOURCE);

  if (!source) {
    return next(req);  // pass through requests with no API source
  }

  const key = apiConfig.getKey(source);
  if (!key) {
    return next(req);  // key not configured yet — pass through
  }

  const cloned = req.clone({
    headers: req.headers.set('X-API-Key', key),
  });
  return next(cloned);
};
```

```typescript
// src/app/core/api/interceptors/error.interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AppError } from '../models/app-error.model';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const normalized: AppError = {
        status: error.status,
        code: error.error?.code ?? 'UNKNOWN',
        message: error.error?.detail ?? error.message ?? 'An unexpected error occurred',
        source: req.context.get(API_SOURCE) ?? 'unknown',
        timestamp: new Date().toISOString(),
      };
      return throwError(() => normalized);
    }),
  );
};
```

```typescript
// src/app/core/api/interceptors/loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  loadingService.increment();
  return next(req).pipe(
    finalize(() => loadingService.decrement()),
  );
};
```

### Pattern 3: Signal-Based Loading Service
**What:** A signal-based counter that tracks in-flight requests; exposes `isLoading` as a computed boolean.
**When to use:** Required by `loadingInterceptor`; consumed by any component that needs to show a spinner.

```typescript
// src/app/core/services/loading.service.ts
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _count = signal(0);
  readonly isLoading = computed(() => this._count() > 0);

  increment(): void { this._count.update(c => c + 1); }
  decrement(): void { this._count.update(c => Math.max(0, c - 1)); }
}
```

### Pattern 4: Centralized ApiConfigService
**What:** Injectable service that reads API keys from the Angular `environment` object at construction time. Provides a `getKey(source)` method and `getEndpoint(api)` method.
**When to use:** All interceptors and API services use this as the single source of truth for keys and base URLs.

```typescript
// src/app/core/api/api-config.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly keys: Record<string, string> = {
    amadeus: environment.amadeusApiKey,
    hotel: environment.hotelApiKey,
    carRental: environment.carRentalApiKey,
    transport: environment.transportApiKey,
    tours: environment.toursApiKey,
    attractions: environment.attractionsApiKey,
    googlePlaces: environment.googlePlacesApiKey,
  };

  // Amadeus uses OAuth2 Bearer, not a simple key — the proxy handles this
  readonly amadeusSecret = environment.amadeusApiSecret;

  // Endpoint registry — all paths are proxy-relative (/api/amadeus, etc.)
  readonly endpoints = {
    amadeus:      `${environment.apiBaseUrl}/api/amadeus`,
    hotels:       `${environment.apiBaseUrl}/api/hotels`,
    carRental:    `${environment.apiBaseUrl}/api/cars`,
    transport:    `${environment.apiBaseUrl}/api/transport`,
    tours:        `${environment.apiBaseUrl}/api/tours`,
    attractions:  `${environment.apiBaseUrl}/api/attractions`,
    googlePlaces: `${environment.apiBaseUrl}/api/places`,
  };

  getKey(source: string): string | null {
    return this.keys[source] ?? null;
  }
}
```

### Pattern 5: ApiService + Mapper (Per Feature)
**What:** Each feature's API concerns live in a co-located `api/` subfolder. The service handles HTTP; the mapper translates the external schema to the internal canonical model.
**When to use:** Every feature that calls an external API (flights, hotels, cars, transport, tours, attractions, places).

```typescript
// src/app/features/search/api/flights-api.service.ts
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfigService } from '../../../core/api/api-config.service';
import { API_SOURCE } from '../../../core/api/interceptors/api-key.interceptor';
import { FlightsMapper } from './flights.mapper';
import { FlightSearchParams, FlightOffer } from '../../../core/models/flight.model';

@Injectable({ providedIn: 'root' })
export class FlightsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfigService);
  private readonly mapper = inject(FlightsMapper);

  searchOffers(params: FlightSearchParams): Observable<FlightOffer[]> {
    return this.http
      .get<AmadeusFlightOffersResponse>(`${this.config.endpoints.amadeus}/v2/shopping/flight-offers`, {
        params: { /* ...map params... */ },
        context: new HttpContext().set(API_SOURCE, 'amadeus'),
      })
      .pipe(map(response => this.mapper.toFlightOffers(response)));
  }
}
```

```typescript
// src/app/features/search/api/flights.mapper.ts
import { Injectable } from '@angular/core';
import { FlightOffer } from '../../../core/models/flight.model';

@Injectable({ providedIn: 'root' })
export class FlightsMapper {
  toFlightOffers(raw: AmadeusFlightOffersResponse): FlightOffer[] {
    return (raw.data ?? []).map(offer => ({
      id: offer.id,
      price: {
        total: parseFloat(offer.price.total),
        currency: offer.price.currency,
      },
      // ... map remaining fields to canonical shape
    }));
  }
}
```

### Pattern 6: Canonical AppError Model
**What:** A normalized error shape that all interceptors/services use. Feature components only ever see `AppError`, never raw `HttpErrorResponse`.
**When to use:** Return from `throwError()` in the error interceptor; catch in feature components.

```typescript
// src/app/core/api/models/app-error.model.ts
export interface AppError {
  status: number;       // HTTP status code (0 = network error)
  code: string;         // API-specific error code or 'UNKNOWN'
  message: string;      // Human-readable message safe to display
  source: string;       // Which API produced this error
  timestamp: string;    // ISO timestamp for logging
}
```

### Pattern 7: Per-Observable catchError (forkJoin Safety)
**What:** Wrap each observable inside a `forkJoin` with `catchError` before combining. This prevents one failed API from cancelling all others.
**When to use:** Any place where multiple API calls are combined — every search result page will need this for the "add to itinerary" aggregation patterns.

```typescript
// Source: RxJS documentation pattern, verified by multiple Angular sources
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppError } from '../core/api/models/app-error.model';

// Pattern: each source gets its own catchError BEFORE forkJoin
forkJoin({
  flights: flightsService.search(params).pipe(
    catchError((err: AppError) => of({ error: err, data: [] }))
  ),
  hotels: hotelsService.search(params).pipe(
    catchError((err: AppError) => of({ error: err, data: [] }))
  ),
}).subscribe(results => {
  // results.flights.error may be set; results.hotels.data may be []
  // page still renders with partial data
});
```

### Pattern 8: debounceTime + Exponential Backoff on 429
**What:** `debounceTime` on the search form value changes prevents request spam. `retry({ count, delay })` with status-conditional logic handles 429 at the interceptor or per-service level.
**When to use:** Search forms (Phase 4+) use `debounceTime`; the backoff can live in the error interceptor or in each service's pipe.

```typescript
// In search form component — prevents request on every keystroke
// Source: RxJS debounceTime, verified against angular.dev
searchControl.valueChanges.pipe(
  debounceTime(400),
  switchMap(query => this.flightsService.search(query)),
).subscribe(results => this.results.set(results));
```

```typescript
// Exponential backoff for 429 — uses modern retry() not deprecated retryWhen
// Source: hexmaster.nl/posts/retry-on-http-requests-with-exponential-backoff/
// Verified: retry({ count, delay }) is RxJS 7.3+ API, not deprecated
import { retry } from 'rxjs/operators';
import { timer } from 'rxjs';

// Can live in the error interceptor or be applied per-service
const withBackoff = <T>(source$: Observable<T>): Observable<T> =>
  source$.pipe(
    retry({
      count: 3,
      delay: (error, retryIndex) => {
        if (error.status === 429 || error.status === 503) {
          return timer(1000 * Math.pow(2, retryIndex));  // 2s, 4s, 8s
        }
        return throwError(() => error);  // non-retriable errors fail immediately
      },
    }),
  );
```

### Pattern 9: Angular CLI Dev Proxy (proxy.conf.json)
**What:** Routes all `/api/*` requests from Angular's dev server to external API base URLs, so CORS never applies during development (request comes from Node.js, not the browser).
**When to use:** Development only. Production uses Cloudflare Worker or Netlify Edge Function.

```json
// src/proxy.conf.json
{
  "/api/amadeus": {
    "target": "https://test.api.amadeus.com",
    "changeOrigin": true,
    "pathRewrite": { "^/api/amadeus": "" },
    "secure": true
  },
  "/api/hotels": {
    "target": "https://booking-com15.p.rapidapi.com",
    "changeOrigin": true,
    "pathRewrite": { "^/api/hotels": "" },
    "secure": true
  }
}
```

```json
// angular.json — add proxyConfig to serve options
{
  "architect": {
    "serve": {
      "builder": "@angular-devkit/build-angular:dev-server",
      "options": {
        "proxyConfig": "src/proxy.conf.json"
      }
    }
  }
}
```

### Anti-Patterns to Avoid
- **Calling `HttpClient` directly inside components:** All HTTP must go through a feature `ApiService`. Components call service methods, not `http.get()`.
- **Putting API keys or secrets in Angular bundle code:** Environment files are bundled. Keys belong in CI/CD environment variables passed to the proxy server, not in `environment.ts`. The `environment.ts` files must remain empty-string placeholders.
- **Using `retryWhen` for backoff:** `retryWhen` is deprecated in RxJS 7. Use `retry({ count, delay })`.
- **Using class-based interceptors:** They still work but have less predictable ordering. Use `HttpInterceptorFn` throughout.
- **Single `catchError` at forkJoin level:** One failing API kills all results. Put `catchError` on each individual observable before `forkJoin`.
- **Doing CORS testing only in development:** The dev proxy makes everything look fine locally. Production CORS failures are a separate class of problem. Every API must be tested from the production URL before Phase 2 is complete.
- **Hardcoding target API base URLs in service files:** All endpoints go through `ApiConfigService.endpoints` so the proxy path can be changed in one place.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP interception chain | Custom middleware wrapper | Angular `withInterceptors([...])` | Angular's chain handles ordering, error propagation, and abort correctly; custom wrappers miss edge cases around request cancellation and zone context |
| Exponential backoff | Custom `retryWhen` + timer logic | `retry({ count, delay: (err, i) => timer(...) })` | `retryWhen` is deprecated; native `retry()` in RxJS 7.3+ handles all edge cases including proper completion/error propagation |
| API key storage | Custom encrypted storage | Environment file + proxy server | Client-side "encryption" of API keys is security theater; the only real protection is keeping keys server-side in the proxy |
| Loading state counter | Custom subject-based counter | Signal counter + `finalize()` in interceptor | Signals are the project standard; `finalize()` handles both success and error paths; a subject-based approach misses cancellation |
| CORS handling | Custom CORS headers in Angular | Cloudflare Worker / Netlify Edge Function | CORS is a browser restriction — Angular can't solve it client-side; any apparent client-side fix is actually just the dev proxy |

**Key insight:** The Angular HTTP interceptor chain is purpose-built for this layer. Every HTTP concern (auth, errors, loading, retry) belongs in a dedicated interceptor, not scattered across services.

---

## Common Pitfalls

### Pitfall 1: Amadeus OAuth2 Token Exposure
**What goes wrong:** Developer puts `amadeusApiKey` and `amadeusApiSecret` in `environment.development.ts` and calls `https://test.api.amadeus.com/v1/security/oauth2/token` directly from Angular. The secret appears in the browser's network tab.
**Why it happens:** Amadeus uses OAuth2 Client Credentials Grant — the flow requires sending both the key AND the secret to get an access token. Sending the secret from a browser exposes it.
**How to avoid:** The Cloudflare Worker / Netlify Edge Function must perform the OAuth2 token exchange server-side and forward the Bearer token to the Amadeus API. Angular never sees the secret.
**Warning signs:** `amadeusApiSecret` appears in any network request originating from the browser.

### Pitfall 2: CORS Passes in Dev, Fails in Production
**What goes wrong:** All APIs appear to work during development (via the Angular dev proxy), but after deployment, some APIs return CORS errors.
**Why it happens:** `proxy.conf.json` is a Node.js proxy that only runs with `ng serve`. In production, the Angular app is static HTML/JS served from a CDN — there is no Node.js proxy. Requests go directly from the browser.
**How to avoid:** Test every API endpoint from a production-equivalent origin before Phase 2 is considered complete. Deploy the Cloudflare Worker first, then test through it.
**Warning signs:** APIs work on `localhost:4200` but fail on production URL with `CORS error: No 'Access-Control-Allow-Origin' header`.

### Pitfall 3: Loading Counter Never Reaches Zero
**What goes wrong:** The `isLoading` signal stays `true` permanently after a failed request.
**Why it happens:** If `loadingInterceptor` calls `loadingService.increment()` but the `finalize()` placement is wrong, a thrown error upstream might bypass the `finalize` operator.
**How to avoid:** `finalize()` in RxJS fires after both `complete` and `error`. Place `finalize()` at the end of the interceptor pipe, after `catchError`. Do NOT put `finalize` before `catchError`.
**Warning signs:** Spinner appears permanently after any network error; `isLoading` is `true` when no requests are in flight.

### Pitfall 4: forkJoin Kills the Page on Single API Failure
**What goes wrong:** A search page uses `forkJoin([flights$, hotels$])` and when hotels API is down, the entire page shows an error with no results — even the flights data is lost.
**Why it happens:** `forkJoin` treats any inner observable error as a top-level error. Without per-observable `catchError`, one failure propagates to the subscriber.
**How to avoid:** Apply `catchError(err => of({ error: err, data: [] }))` to each observable BEFORE passing to `forkJoin`. The forkJoin observable itself never errors; callers check each result for `.error`.
**Warning signs:** User gets blank page when any single API is unavailable.

### Pitfall 5: debounceTime on Wrong Stream
**What goes wrong:** `debounceTime` is applied to the HTTP observable rather than the form value stream, so every request still fires but is just delayed.
**Why it happens:** Misunderstanding what debounce prevents — it prevents REQUEST CREATION, not request delay. It must sit before `switchMap`, on the value changes stream.
**How to avoid:** `valueChanges.pipe(debounceTime(400), switchMap(...))` — debounce the input values, not the HTTP calls.
**Warning signs:** Rapid typing still fires multiple HTTP requests; network tab shows 1 request per keystroke.

### Pitfall 6: Interceptor Ordering Affects Key Injection vs Error Handling
**What goes wrong:** Error interceptor runs before API key interceptor. Requests fail with 401 "no API key" but the error interceptor catches it before the key is injected.
**Why it happens:** Angular executes interceptors in array order for requests, but in REVERSE order for responses. The request path is `[0, 1, 2]`, the response path is `[2, 1, 0]`.
**How to avoid:** Order: `[apiKeyInterceptor, errorInterceptor, loadingInterceptor]`. API key is injected first on outgoing requests. Error normalization catches errors on the way back. Loading state wraps the whole thing.
**Warning signs:** API calls fail with authentication errors that don't have the key in the request headers.

---

## Code Examples

Verified patterns from official sources:

### Complete provideHttpClient Registration
```typescript
// Source: angular.dev/guide/http/setup
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

provideHttpClient(
  withFetch(),                       // Use modern Fetch API
  withInterceptors([
    apiKeyInterceptor,               // Injects API keys via HttpContextToken
    errorInterceptor,                // Normalizes all errors to AppError
    loadingInterceptor,              // Tracks in-flight count via signal
  ]),
)
```

### Complete Functional Interceptor Signature
```typescript
// Source: angular.dev/guide/http/interceptors
import { HttpInterceptorFn } from '@angular/common/http';

export const myInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() works here because interceptors run in injection context
  const service = inject(SomeService);
  return next(req);  // next returns Observable<HttpEvent<unknown>>
};
```

### HttpContextToken Pattern
```typescript
// Source: angular.dev/guide/http/interceptors
import { HttpContext, HttpContextToken } from '@angular/common/http';

// Define token with default value
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

// Set in call site
http.get('/public-endpoint', {
  context: new HttpContext().set(SKIP_AUTH, true),
});

// Read in interceptor
if (req.context.get(SKIP_AUTH)) {
  return next(req);
}
```

### Modern retry() with Exponential Backoff
```typescript
// Source: RxJS 7.3+ retry() API
// Verified: retryWhen is deprecated, retry({ delay }) is the replacement
import { retry } from 'rxjs/operators';
import { timer, throwError } from 'rxjs';

source$.pipe(
  retry({
    count: 3,
    delay: (error, retryIndex) => {
      // Only retry on 429 and transient server errors
      if ([429, 502, 503, 504].includes(error.status)) {
        const delay = 1000 * Math.pow(2, retryIndex);  // 2s, 4s, 8s
        return timer(delay);
      }
      // Non-retriable errors (400, 401, 403, 404) pass through immediately
      return throwError(() => error);
    },
  }),
);
```

### Proxy Configuration (Dev Only)
```json
// src/proxy.conf.json — Development only, not deployed
// Source: Angular CLI proxy docs (verified by multiple community sources)
{
  "/api/amadeus": {
    "target": "https://test.api.amadeus.com",
    "changeOrigin": true,
    "pathRewrite": { "^/api/amadeus": "" },
    "secure": true,
    "logLevel": "debug"
  }
}
```

```json
// angular.json: serve > options
{
  "proxyConfig": "src/proxy.conf.json"
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based `HttpInterceptor` | Functional `HttpInterceptorFn` | Angular 15 (stable) | Functional interceptors are now standard; class-based still works but is no longer recommended for new code |
| `retryWhen` for backoff | `retry({ count, delay })` | RxJS 7.3+ | `retryWhen` is deprecated; `retry()` with config is cleaner and not deprecated |
| `APP_INITIALIZER` token | `provideAppInitializer()` | Angular recent (2025) | `APP_INITIALIZER` is deprecated; `provideAppInitializer()` is the new API for config loading |
| `withInterceptorsFromDi()` (class-based DI) | `withInterceptors([...])` | Angular 15 | Functional interceptors registered inline; class-based requires extra DI providers |
| `HttpClientModule` (NgModule) | `provideHttpClient()` (standalone) | Angular 15+ | No NgModule needed; tree-shakable configuration features |

**Deprecated/outdated:**
- `retryWhen`: Deprecated in RxJS 7. Angular docs issue #49489 flagged this. Use `retry({ count, delay })`.
- `APP_INITIALIZER` token: Deprecated. Use `provideAppInitializer()` for config loading on app startup.
- `HttpClientModule`: Works but is the NgModule era API. `provideHttpClient()` is canonical for standalone.
- Class-based interceptors via `withInterceptorsFromDi()`: Still functional, not recommended for new code.

---

## Open Questions

1. **CORS status for Amadeus test.api.amadeus.com**
   - What we know: Amadeus uses OAuth2 Client Credentials Grant which requires an API secret. Their FAQ does not mention CORS support for browser-based calls. Their documentation recommends SDKs (Node/Python/Java/PHP) — all server-side.
   - What's unclear: Whether `test.api.amadeus.com` emits `Access-Control-Allow-Origin` headers. Training data confidence: LOW.
   - Recommendation: **Validate live as the first task of Plan 02-05.** Open DevTools in a deployed (non-localhost) page and attempt a fetch to `https://test.api.amadeus.com/v1/security/oauth2/token`. Treat this API as proxy-required until proven otherwise. The Amadeus secret alone makes proxy mandatory regardless of CORS status.

2. **CORS status for Viator partner API**
   - What we know: Viator offers a Partner API for tour/experience data. No information found on CORS headers.
   - What's unclear: Whether their API supports browser-direct access or requires server-side calling. Viator API requires partnership approval for production access.
   - Recommendation: **Validate live in Plan 02-05.** If Viator requires partnership credentials not yet obtained, use a fallback mock in Phase 2 and defer live validation.

3. **CORS status for OpenTripMap API**
   - What we know: OpenTripMap uses API key in query parameter (`apikey=...`). Free tier available. Endpoint is `https://api.opentripmap.com/0.1/en/`.
   - What's unclear: CORS headers are not documented. Some community implementations suggest browser-direct works, but this is LOW confidence.
   - Recommendation: **Test live in Plan 02-05.** If CORS headers are present and the key is in a query param (not a header that triggers CORS preflight), direct browser access may be viable — but validate before committing.

4. **Rome2rio API availability**
   - What we know: Rome2rio is NOT accepting new API applications as of early 2025. They are a Google Cloud customer (route/transit data). The API appears partner-restricted.
   - What's unclear: Whether access can be obtained for this project, or if an alternative transport API (e.g., Railsbot, Skyscanner, or a self-hosted OSRM instance) should be planned instead.
   - Recommendation: **Do not plan around Rome2rio.** Plan 02-05 should evaluate alternatives for the `transportApiKey` slot. Mark `transport` as "API TBD" in the config service documentation.

5. **Amadeus OAuth2 token refresh in proxy**
   - What we know: Amadeus access tokens expire in 30 minutes. The proxy must obtain and cache a token, then refresh it automatically.
   - What's unclear: Whether the Cloudflare Worker or Netlify Edge Function for Amadeus should implement token caching (using KV store or in-memory) or simply re-request a token per call.
   - Recommendation: **Per-call token refresh is simpler for Phase 2 validation.** Token caching is a performance optimization for Phase 4+. Document this as a known technical debt in Plan 02-05 notes.

6. **`withFetch()` compatibility with Angular Material**
   - What we know: `withFetch()` switches `HttpClient` from XMLHttpRequest to the Fetch API. Known limitation: no upload progress events. Angular Material does not make HTTP calls.
   - What's unclear: Any other Angular/Material component that might depend on XHR upload progress.
   - Recommendation: **Use `withFetch()`.** This project does not require file uploads in Phase 2 or any foreseeable phase. If file upload is needed later, `withFetch()` can be removed then.

---

## Sources

### Primary (HIGH confidence)
- `angular.dev/guide/http/setup` — `provideHttpClient()`, `withFetch()`, `withInterceptors()`, `withJsonpSupport()`, `withXsrfConfiguration()` documentation
- `angular.dev/guide/http/interceptors` — Functional interceptor signature, `inject()` in interceptors, `HttpContextToken`, `HttpContext` pattern
- `angular.dev/api/common/http/withInterceptors` — API signature: `HttpInterceptorFn[]` parameter, return type `HttpFeature<HttpFeatureKind.Interceptors>`
- `angular.dev/api/core/APP_INITIALIZER` — Deprecation confirmed; `provideAppInitializer()` is the replacement
- `angular.dev/api/core/provideAppInitializer` — New API for app initialization

### Secondary (MEDIUM confidence)
- `hexmaster.nl/posts/retry-on-http-requests-with-exponential-backoff/` — `retry({ count, delay })` pattern with status-conditional logic; verified against RxJS 7.3+ API
- `developers.amadeus.com/self-service/apis-docs/guides/developer-guides/API-Keys/authorization/` — OAuth2 Client Credentials Grant confirmed; API secret security requirement confirmed
- `developers.cloudflare.com/workers/examples/cors-header-proxy/` — CORS proxy implementation pattern; OPTIONS preflight handling; `Access-Control-Allow-Origin` header injection
- `answers.netlify.com/t/support-guide-handling-cors-on-netlify/107739` — Netlify CORS handling guide for Edge Functions
- `plainenglish.io/blog/all-you-need-to-know-about-angular-proxy-configuration` — `proxy.conf.json` options (`target`, `changeOrigin`, `pathRewrite`, `secure`, `logLevel`)
- `betterprogramming.pub/rxjs-error-handling-with-forkjoin/` — Per-observable `catchError` before `forkJoin` pattern; verified by multiple Angular community sources

### Tertiary (LOW confidence — validate before implementing)
- `github.com/alex-okrushko/backoff-rxjs` — `retryBackoff()` operator as alternative to native `retry({ delay })`; unverified against current project RxJS version compatibility
- Rome2rio API availability — multiple indirect sources suggest API is partner-restricted and not accepting new applications; not directly verified from official Rome2rio page (403 response)
- OpenTripMap CORS status — not documented in official API docs; must be tested live
- Amadeus CORS headers for browser-direct access — not confirmed in official docs; must be tested live before committing to direct vs. proxy strategy

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `provideHttpClient`, `withInterceptors`, `HttpInterceptorFn` all confirmed via angular.dev official docs
- Architecture patterns: HIGH — functional interceptor patterns, `HttpContextToken`, per-observable `catchError` confirmed via official docs and multiple verified sources
- CORS strategy (Angular CLI dev proxy): HIGH — `proxy.conf.json` + `angular.json proxyConfig` confirmed via multiple community sources, consistent with Angular CLI documentation
- CORS strategy (production proxy): MEDIUM — Cloudflare Worker implementation confirmed via official Cloudflare docs; Netlify Edge Function pattern confirmed; which specific APIs NEED a proxy is LOW confidence pending live validation
- Target API CORS status (Amadeus, Viator, OpenTripMap, Rome2rio): LOW — not confirmed in official docs; must be tested live as first task of Plan 02-05
- Retry/backoff patterns: HIGH — `retry({ count, delay })` confirmed as RxJS 7.3+ non-deprecated API; exponential delay formula verified
- RxJS deprecations: HIGH — `retryWhen` deprecated status confirmed via Angular GitHub issue #49489

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days — Angular HTTP API stable; CORS findings need live validation before planning begins)
