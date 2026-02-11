# Pitfalls Research

**Domain:** Angular travel planning aggregator (frontend-only, multi-API)
**Researched:** 2026-02-11
**Confidence:** MEDIUM — WebSearch and WebFetch unavailable; findings based on Angular official docs knowledge (training data through Jan 2025) + well-established browser security fundamentals. Flag any API-specific CORS claims for validation against target API docs.

---

## Critical Pitfalls

### Pitfall 1: CORS Blocking Kills Core Features at Demo Time

**What goes wrong:**
You integrate 6 APIs during development using Angular's dev proxy (`proxy.conf.json`). Everything works locally. On deploy (Netlify, Vercel, GitHub Pages), the proxy disappears and every API call hits a browser CORS wall. Many travel APIs — especially hotel and flight aggregators — do not send `Access-Control-Allow-Origin: *` headers because they are designed for server-to-server use, not browser use.

**Why it happens:**
Angular's `ng serve` proxy transparently forwards requests server-side, hiding CORS entirely during development. Developers assume if it works in dev it will work in prod. The proxy is a development-only tool. It does not exist in built output.

**How to avoid:**
1. Test every target API from a production-equivalent environment (no proxy) **before writing integration code**. Use `curl` with an `Origin` header to simulate a cross-origin browser request:
   `curl -H "Origin: https://yourdomain.com" -I https://api.target.com/endpoint`
2. For APIs that block CORS: route them through a lightweight Cloudflare Worker or Netlify Edge Function acting as a CORS proxy. This keeps the API key server-side as a bonus.
3. Document CORS status per API in a decision log — do not discover this at deploy time.

**Warning signs:**
- API documentation says "server-side SDK only" or shows only Node/Python examples
- API requires OAuth client credentials flow (usually server-side)
- Dev works but `ng build` + local static serve (no proxy) fails immediately
- API requires `Authorization: Bearer` with a secret token

**Phase to address:**
Phase 1 (API Integration Setup) — validate CORS for every API before writing service layer. If CORS fails, design the proxy solution in the same phase.

---

### Pitfall 2: API Keys Hardcoded in Angular Source Are Publicly Readable

**What goes wrong:**
API keys placed in `environment.ts` or any TypeScript constant are compiled into the JavaScript bundle. Anyone can open DevTools → Sources → search bundle files and find the key in seconds. For travel APIs (Amadeus, Skyscanner, Booking.com affiliate, etc.), exposed keys can cause:
- Billing fraud (your quota consumed by someone else)
- API account suspension for ToS violation
- Competitor scraping your pricing data

**Why it happens:**
Angular's `environment.ts` is designed for build-time configuration, not secrets. Developers from backend backgrounds assume environment variables work the same as server-side `process.env`. They do not. Everything in the Angular build output is public.

**How to avoid:**
There is no safe way to keep a secret in a pure frontend app. Accept this constraint and choose a mitigation:

**Option A (preferred for this project):** Use only APIs that allow browser-side keys scoped to a domain allowlist (e.g. Google Maps Platform, some affiliate APIs). Register the domain and rely on API-side restriction, not secrecy.

**Option B:** Proxy sensitive API calls through a Cloudflare Worker or Netlify Function. The worker holds the real key as an environment variable; Angular calls the worker URL. Adds ~50ms latency but eliminates secret exposure.

**Option C (MVP compromise):** Accept the exposure for low-value affiliate APIs, rotate keys regularly, monitor usage dashboards. Only acceptable when: key has no billing attached, API has generous abuse controls, key can be revoked instantly.

Do NOT rely on obfuscation, key splitting, or base64 encoding. These are security theater.

**Warning signs:**
- API key visible in `environment.ts` or `environment.prod.ts`
- API provider charges per call and has no domain restriction feature
- No key rotation plan exists

**Phase to address:**
Phase 1 (API Integration Setup) — define key strategy per API before any integration. Add a "Key Exposure Audit" to the phase definition of done.

---

### Pitfall 3: Unhandled Parallel API Failures Freeze the Search UI

**What goes wrong:**
When 6 APIs are called in parallel with `forkJoin` or `combineLatest`, one slow or erroring API stalls the entire result set. `forkJoin` waits for all observables to complete — if one throws, the whole join errors and you get zero results. Users see a perpetual spinner or an error page even though 5 APIs returned fine data.

**Why it happens:**
`forkJoin` is the intuitive "call everything at once" operator, but its all-or-nothing completion semantics are wrong for resilient aggregation. Developers treat API calls like synchronous functions — if one fails, handle it with a catch — but don't realize the catch must be applied to each inner observable, not the outer join.

**How to avoid:**
Per-observable error isolation is mandatory for aggregators:

```typescript
// WRONG: one failure kills all results
forkJoin([flightApi$, hotelApi$, carApi$]).subscribe(results => ...);

// CORRECT: isolate errors per source
const safeFlights$ = flightApi$.pipe(catchError(err => of({ source: 'flights', error: err, data: [] })));
const safeHotels$ = hotelApi$.pipe(catchError(err => of({ source: 'hotels', error: err, data: [] })));

forkJoin([safeFlights$, safeHotels$, ...]).subscribe(results => {
  // results always has 6 items; check .error on each
});
```

Show partial results with per-source error indicators. "Hotels unavailable — showing flights and cars" is infinitely better than a blank page.

**Warning signs:**
- `forkJoin` used without `catchError` on each inner observable
- Error state is a full-page block rather than a per-source banner
- No UI distinction between "loading" and "this source failed"

**Phase to address:**
Phase 2 (Search Results) — define error isolation pattern as a requirement before building the aggregation service.

---

### Pitfall 4: localStorage Quota Exceeded Silently Corrupts Saved Trips

**What goes wrong:**
`localStorage` has a ~5MB limit (varies by browser). A travel app that saves itinerary data, search history, cached API responses, and user preferences can hit this limit with moderate usage. When quota is exceeded, `localStorage.setItem()` throws a `QuotaExceededError`. If uncaught, the save silently fails and the user's trip data is lost. Worse, partial saves leave corrupted state.

**Why it happens:**
Developers test with small amounts of data. The limit feels generous. API responses (especially hotel lists with images, descriptions, and metadata) are large. Search history accumulates. Cache layers pile up. The failure only appears in real usage with real data.

**How to avoid:**
1. Wrap all `localStorage.setItem` calls in try/catch and surface errors to the user.
2. Implement a storage budget per namespace: trips get 2MB, cache gets 1.5MB, preferences get 0.5MB.
3. Cache API responses with TTL — expire and evict old cache entries before writing new ones.
4. Compress large data with LZ-string before storing (reduces size 60-70% for JSON).
5. Consider IndexedDB via the `idb` library for large structured data — no practical size limit for most usage.

```typescript
// Minimum safe wrapper
private save(key: string, data: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      this.handleStorageFull();
    }
    return false;
  }
}
```

**Warning signs:**
- Raw `localStorage.setItem` calls without try/catch
- API responses cached in localStorage without TTL or size limits
- No eviction strategy documented

**Phase to address:**
Phase 1 (Core Storage) — implement the safe storage wrapper before any feature uses it.

---

### Pitfall 5: Angular Signals Mixed with RxJS Subscriptions Creates Memory Leaks and Stale State

**What goes wrong:**
Angular 17+ introduces signals as a reactive primitive, but HTTP calls via `HttpClient` still return Observables. The common mistake: converting observables to signals with `toSignal()` inside components instead of services, creating duplicate subscriptions per component instance. Or mixing signal writes inside subscribe callbacks, breaking change detection and causing stale UI that never updates.

**Why it happens:**
The signals API is new (Angular 16+), and community patterns for signals + HTTP are still stabilizing. Developers copy patterns from RxJS-heavy apps and bolt signals on top, creating hybrid monstrosities where state flows through both systems simultaneously.

**How to avoid:**
Establish one canonical pattern and enforce it project-wide:

- HTTP calls live in services as Observables (HttpClient returns Observables, keep them as Observables).
- Services expose state as signals: `private _results = signal<Flight[]>([])` with a public `results = this._results.asReadonly()`.
- Services update signals via `toSignal()` in the service constructor, not in components.
- Components read signals only — zero subscriptions in components.
- Use `takeUntilDestroyed()` (Angular 16+) for any remaining Observable subscriptions in components.

Never write to a signal inside a `subscribe()` callback unless you fully understand the change detection implications.

**Warning signs:**
- `toSignal()` called inside a component's constructor or `ngOnInit`
- `new Subject()` in components that never calls `.complete()`
- `subscribe()` without `takeUntilDestroyed()` or `unsubscribe()` in `ngOnDestroy`
- Multiple API calls firing when navigating back to a page

**Phase to address:**
Phase 1 (Architecture Setup) — define the signals/RxJS boundary as a documented team convention before any feature is built.

---

### Pitfall 6: Travel API Rate Limits Cause User-Facing Failures Under Normal Usage

**What goes wrong:**
Most travel APIs (especially flight search — Amadeus free tier allows 1 call/second, Skyscanner has strict rate limits) enforce per-minute and per-day rate limits. An app that fires a new search request on every keystroke or form change will exhaust limits within seconds during a demo. Users see unexplained errors. In production, a few concurrent users can exhaust a shared API quota.

**Why it happens:**
Developers don't read the rate limit documentation until they hit a 429 error. Angular reactive forms make it easy to subscribe to every `valueChanges` event — triggering an API call for each character typed.

**How to avoid:**
1. Debounce all search triggers: `debounceTime(500)` minimum before firing API calls.
2. Deduplicate identical queries: if a user searches "Paris" twice in a row, serve the cached result.
3. Implement exponential backoff for 429 responses with RxJS `retryWhen` or `retry({ count: 3, delay: (_, n) => timer(Math.pow(2, n) * 1000) })`.
4. Centralize rate limit tracking in a service that queues requests and enforces per-API limits.
5. Read the exact rate limit for every API in the free tier vs. paid tier before starting.

**Warning signs:**
- `valueChanges` on search form wired directly to an API call observable without `debounceTime`
- No retry logic in API service methods
- 429 errors not differentiated from other errors in the UI

**Phase to address:**
Phase 2 (Search Integration) — add debounce and rate limit handling as acceptance criteria for the first API integration task.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| API keys in `environment.ts` | Zero setup, works immediately | Keys scraped, account suspended, data stolen | Never for paid APIs. Only for keys with domain restrictions and no billing. |
| Raw `localStorage.setItem` without try/catch | Simple code | Silent data loss when quota exceeded | Never — the wrapper is 5 lines |
| `forkJoin` without per-observable `catchError` | Simpler code | One failing API blanks all results | Never for aggregation — partial results are always better |
| Hardcoded timeout of 10s per API call | Easy to set | Slow APIs block UI for 10 full seconds | Replace with per-API tuned timeouts in Phase 2 |
| Angular dev proxy for all APIs | Works in dev immediately | Proxy doesn't exist in production | MVP only — must resolve before first deployment |
| No caching of API responses | Always fresh data | Rate limits hit immediately under real use | Never — minimum 5-minute TTL for travel prices |
| Inline `HttpClient.get()` in components | Fast to write | Untestable, duplicated, no retry logic | Never — all HTTP in services from day 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Amadeus API | Using client credentials flow directly from browser (client_secret exposed) | Use Amadeus's test environment with a key that has no billing, or proxy via Cloudflare Worker |
| Google Flights/Travel | Scraping Google search results — ToS violation | Use Amadeus or Duffel for flight data; Google Flights has no public API |
| Booking.com Affiliate | Assuming `Access-Control-Allow-Origin: *` — it's partner-only and CORS-restricted | Route through a proxy function or confirm CORS support with affiliate program manager |
| Currency conversion APIs | Fetching live rates on every price display | Cache exchange rates for 1 hour minimum; rates don't move meaningfully in minutes |
| Weather APIs | Calling on every map pan | Debounce + cache by location+date key; OpenWeatherMap free tier is 60 calls/minute |
| Mapping (Google Maps / Leaflet) | Loading map before user interacts with it | Lazy-load map component; it adds 400KB+ to initial bundle |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No virtual scrolling for search results | Search page scrolls to 500+ DOM nodes; janky scroll at 60fps | Use Angular CDK `VirtualScrollViewport` for result lists | At ~100 results |
| Loading all destination data upfront | 2-4 second initial page load; large JS bundle | Lazy-load route modules; load destination data on demand | From day 1 if dataset > 50KB |
| No HTTP caching headers respected | Every page visit re-fetches same API data | Implement in-memory cache service with TTL per API; honor `Cache-Control` | Immediately — wasted rate limit calls |
| Mapping library in main bundle | 400KB+ added to initial load | Load Leaflet or Google Maps SDK lazily only when map view is activated | From first build |
| Storing API response arrays in signals without memoization | Rerender entire result list on any signal update | Use `computed()` for derived lists; `trackBy` on `*ngFor` | At ~50 results per source |
| Date/time math done in component templates | Re-calculated on every change detection cycle | Pre-calculate in service, store result; pure pipes with memoization for display | Noticeable at moderate usage |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API keys for paid services in Angular build output | Billing fraud, account suspension, ToS violation, competitor access | Use domain-restricted keys only, or proxy paid APIs through Cloudflare Workers / Netlify Functions |
| Affiliate link parameters constructed client-side without validation | URL injection, tracking fraud, commission theft | Sanitize all parameters; store affiliate ID server-side if possible; use Angular's `DomSanitizer` for URLs |
| Storing user itinerary data in localStorage without any sanitization | XSS via stored data if app ever renders stored content as HTML | Never use `innerHTML` with stored data; always use Angular template binding `{{ }}` |
| Trusting API response data and rendering it without sanitization | XSS if a malicious or compromised API returns script tags | Angular templates auto-escape by default — never use `bypassSecurityTrustHtml` on API data |
| No Content Security Policy header | XSS attacks easier; data exfiltration | Configure CSP at hosting level (Netlify `_headers`, Vercel `vercel.json`) — blocks inline script injection |
| CORS proxy with no origin validation | Your proxy becomes a public relay for anyone | Validate `Origin` header in proxy function; whitelist only your app's domain |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Single global loading spinner for parallel API calls | User has no idea which sources are loading vs. done; spinner persists until slowest API | Per-source loading indicators; show results as each source completes |
| "No results found" with no context | User doesn't know if search failed, has no results, or is still loading | Distinguish: "Still searching 2 sources...", "0 results from flights (all sources returned)", "Search failed — try again" |
| Search form resets on navigation | User loses their search parameters when navigating to a detail page and pressing back | Persist search parameters in URL query params (`Router.navigate` with `queryParams`); restore on init |
| No error messaging when one of 6 APIs fails | User doesn't know prices may be incomplete | Show per-source status: "Hotel prices from Booking.com unavailable" with retry button |
| Affiliate link opens in same tab | User loses their search session | All affiliate links: `target="_blank" rel="noopener noreferrer"` |
| Date picker doesn't block past dates | Users select past dates, API returns errors or empty results | Set `min` on date inputs to today; validate on submit |
| Currency shown without specifying source | "Is this USD or EUR?" confusion | Always display currency code next to price; note exchange rate and timestamp if converted |
| No distinction between "live" and "cached" prices | Stale price leads to booking surprise | Show timestamp on prices: "Prices from 5 min ago"; add refresh button |

---

## "Looks Done But Isn't" Checklist

- [ ] **CORS validation:** Tested every API from deployed URL (not dev proxy). Confirmed which work natively and which need a proxy.
- [ ] **API key scoping:** Every key is either domain-restricted at the provider level OR routed through a proxy. No unscoped paid-API keys in bundle.
- [ ] **Error isolation:** `forkJoin` / parallel calls each have per-observable `catchError`. One API failure shows a warning, not a blank page.
- [ ] **localStorage safety:** Every `setItem` wrapped in try/catch with quota handler. Cache has TTL and eviction logic.
- [ ] **Rate limiting:** `debounceTime` on all search triggers. API service has retry with exponential backoff. 429 responses handled gracefully.
- [ ] **Memory leaks:** All component subscriptions use `takeUntilDestroyed()`. `toSignal()` only called in service constructors, not component lifecycle hooks.
- [ ] **Search state persistence:** Active search parameters saved to URL query params. Navigating back restores last search.
- [ ] **Affiliate links:** All external booking links use `target="_blank" rel="noopener noreferrer"`.
- [ ] **Loading states:** Per-source loading state, not single global spinner. Progressive result display as sources complete.
- [ ] **Bundle size:** Map library lazy-loaded. Heavy libraries not in main chunk. Route-level code splitting enabled.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CORS failure discovered post-deploy | HIGH | Add Cloudflare Worker or Netlify Edge Function per blocked API; update Angular service base URLs; re-test all environments |
| API key scraped and abused | HIGH | Revoke key immediately; rotate; add domain restriction or move to proxy; audit usage logs for abuse scope |
| localStorage corruption from quota error | MEDIUM | Add `try/catch` wrapper; add version key to storage schema; write migration that clears corrupt keys on app init |
| forkJoin error causes blank results | LOW | Add `catchError(() => of(fallback))` per observable; already written code can be wrapped without restructure |
| Rate limits exhausted | MEDIUM | Add request queue service with per-API token bucket; add in-memory cache; may require API tier upgrade |
| Memory leak from unmanaged subscriptions | MEDIUM | Audit all components for `.subscribe()` calls; add `takeUntilDestroyed()`; use Angular DevTools to verify destroy |
| Signals/RxJS hybrid causing stale state | HIGH | Refactor to clean boundary: observables in services, signals as state; no signal writes inside subscribe callbacks |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CORS blocking on production deploy | Phase 1 — API Integration Setup | Test each API from a static production deploy (no proxy) before marking integration complete |
| API key exposure in bundle | Phase 1 — API Integration Setup | Run `grep -r "apiKey\|api_key\|secret" dist/` after build; ensure keys are domain-restricted or proxied |
| forkJoin failure blanks results | Phase 2 — Search Results Aggregation | Kill one API in DevTools Network (block request) — verify other results still show |
| localStorage quota exceeded | Phase 1 — Core Storage Layer | Write a test that fills storage to 4.9MB and verifies `setItem` fails gracefully |
| Signals/RxJS memory leaks | Phase 1 — Architecture Setup | Add Angular DevTools check to DoD; verify no active subscriptions after component destroy |
| Rate limits under real usage | Phase 2 — Search Integration | Throttle test: run 20 rapid searches; verify debounce fires only 1 API call; verify 429 shows user message |
| Search state lost on navigation | Phase 2 — Search UX | Acceptance test: search, click result detail, hit back — search params restored in form |
| No per-source loading/error states | Phase 2 — Search UX | Kill one API mid-request; verify user sees "source unavailable" banner, not empty results |
| Affiliate links opening in same tab | Phase 3 — Booking Integration | Verify all affiliate `<a>` tags have `target="_blank"` and `rel="noopener noreferrer"` |
| Missing bundle optimization | Phase 3 — Production Readiness | Run `ng build --stats-json` + webpack-bundle-analyzer; map library must not be in initial chunk |

---

## Sources

- Angular official HTTP guide (angular.dev/guide/http) — MEDIUM confidence (training data, not live-verified due to tool restrictions)
- Angular Signals documentation (angular.dev/guide/signals) — MEDIUM confidence (training data through Jan 2025)
- `takeUntilDestroyed` — Angular 16+ feature, confirmed in Angular release notes
- `forkJoin` + `catchError` isolation pattern — HIGH confidence (RxJS official behavior, well-documented)
- Browser `localStorage` 5MB quota — HIGH confidence (specified in Web Storage spec, consistent across MDN and browser vendors)
- `QuotaExceededError` exception name — HIGH confidence (Web Storage Level 2 spec)
- Travel API CORS behavior (Amadeus, Booking.com) — LOW confidence (training data only; MUST verify against each API's current docs before Phase 1)
- Angular dev proxy build behavior — HIGH confidence (official Angular CLI behavior, well-documented)
- CSP configuration for Netlify/Vercel — MEDIUM confidence (platform docs, training data)

---
*Pitfalls research for: Angular travel planning aggregator (Triply)*
*Researched: 2026-02-11*
