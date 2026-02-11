# Feature Research

**Domain:** Travel planning aggregator web app
**Researched:** 2026-02-11
**Confidence:** MEDIUM (training data through early 2025; WebSearch/WebFetch unavailable for live verification — competitor feature sets are stable and well-documented)

---

## Competitor Reference Set

Apps surveyed from training knowledge:
- **TripIt** — email-parsing itinerary organizer, the gold standard for trip organization
- **Kayak** — meta-search + Trips itinerary product
- **Google Trips** (discontinued 2019, features absorbed into Google Travel/Maps)
- **Wanderlog** — collaborative itinerary builder with maps
- **Rome2rio** — multi-modal transport routing aggregator
- **Sygic Travel** — day-by-day trip planner with POI data
- **Hopper** — price prediction + booking aggregator (flight/hotel/car)
- **Skyscanner** — meta-search with multi-city and explore features

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Flight search with origin/destination/date** | Every travel app starts here; users won't engage without it | MEDIUM | Date picker, passenger count, cabin class, one-way/round-trip/multi-city toggle |
| **Hotel search by destination and check-in/check-out dates** | Direct pair with flight; users plan accommodation immediately after flights | MEDIUM | Room count, guest count, date range |
| **Results list with price, provider name, and link to book** | Users expect to see what they found and click through to book | LOW | External redirect model is acceptable; no checkout needed |
| **Sort and basic filter on search results** | Any e-commerce search without sort/filter feels broken | MEDIUM | Sort by price/duration/rating; filter by stops, price range, star rating |
| **Day-by-day itinerary view** | The core organizational artifact users come for | HIGH | Date-indexed timeline; this is the primary UI surface |
| **Add item to itinerary from search results** | Users expect one-click "add to my trip" from results | MEDIUM | Requires itinerary state + item model connecting search result to day slot |
| **Manual item entry for itinerary** | Users always have items not found via search (restaurant reservations, family activities) | LOW | Free-text title, date, time, notes field |
| **Trip persistence across sessions** | Users plan over multiple sessions; losing data is catastrophic | LOW | localStorage is sufficient for v1; no login required |
| **Multi-destination / multi-day trip support** | Real trips span multiple cities and many days | MEDIUM | Itinerary must support N days, not just a single date |
| **Car rental search** | Standard travel trio: flights + hotel + car | MEDIUM | Pick-up/drop-off location, date/time, driver age |
| **Display of search result details** | Price, duration, stops, provider logo — users need enough detail to decide | LOW | Card/list UI, expandable details |
| **Mobile-responsive layout** | Most travel research happens on mobile or switches between devices | MEDIUM | Angular Material is responsive by default but layout decisions matter |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **All 6 categories in one search surface** | Competitors typically excel at 1-2 categories; Triply covers flights + hotels + cars + intercity transport + tours + attractions in one app | HIGH | Most differentiated if the search experience is unified; partial coverage feels broken |
| **Intercity / ground transport search (buses, trains)** | Rome2rio is the main player; most flight aggregators ignore this entirely | HIGH | Rome2rio API or similar; covers budget travelers and regions where flying isn't default |
| **Tours and activities search** | Viator/GetYourGuide/Klook category; no flight aggregator does this well in context | HIGH | Contextual — surfaces when user has a destination and date on itinerary |
| **Contextual search (search relative to itinerary days)** | "Show me tours in Paris on Day 4" rather than a blank search box | HIGH | Requires itinerary state to drive search context; major UX win |
| **Attractions / POI search within itinerary context** | Turns the app from a booking tool into an actual trip planner | MEDIUM | Can use Google Places, OpenTripMap, or similar for POI data |
| **Drag-and-drop itinerary reordering** | Users frequently reorganize; this is expected in modern tools but many apps lack it | MEDIUM | Angular CDK DragDrop; significant UX improvement over forms |
| **Time-gap visualization on itinerary** | Shows dead time between activities; helps users see when they're overcommitting or underplanning | MEDIUM | Derived from scheduled times; no extra data needed |
| **Price comparison across providers for same route** | Meta-search value: surface best price without user visiting 5 sites | HIGH | Requires aggregating multiple API responses for the same query |
| **No-login trip planning** | Zero friction to start; most competitors require signup before saving anything | LOW | This is already in scope; leads with speed and privacy |
| **Share-able trip link (read-only)** | Users want to share their itinerary with travel companions without requiring them to sign up | MEDIUM | Encode itinerary as URL-safe base64 or similar; no backend needed |
| **"Explore" or open-ended destination discovery** | Users who don't know where to go next; Hopper and Skyscanner's "Explore" are popular | HIGH | Out of scope for v1 but high engagement feature |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **User authentication / accounts in v1** | Persistence, sharing, cross-device sync | Adds auth infrastructure, security surface, email verification, password reset; blocks launch; localStorage + shareable link covers 80% of the value | localStorage persistence + URL-based sharing |
| **In-app booking / checkout** | Convenience of not leaving the app | Requires payment processing, supplier integrations, PCI compliance, refund handling; orders-of-magnitude scope increase | Redirect to provider with affiliate links |
| **Price alerts and tracking** | Users want to know when prices drop | Requires backend cron jobs, notification infrastructure, user accounts; entire separate product | Link to provider's price alert feature |
| **Real-time price updates on itinerary** | Keep saved prices current | Prices change constantly; stale prices mislead users; requires polling APIs (rate limits, cost) | Show "as of [date]" timestamp; re-search to refresh |
| **AI trip generation ("plan my trip to Tokyo for 5 days")** | High perceived value, trendy | LLM integration adds latency, cost, hallucination risk, and API dependency; distracts from core search and organize loop | Day-by-day builder + contextual search achieves the same organization goal |
| **Offline mode / PWA with service workers** | Travel contexts often have poor connectivity | Complex caching strategy, sync conflicts, significant testing surface; localStorage already gives basic persistence | localStorage covers offline read; re-search when reconnected |
| **Social features (follow, like, copy itineraries)** | Engagement, discovery | Social graphs are a product unto themselves; moderation, content quality, cold start problem | Shareable link covers the sharing need; social layer is v3+ |
| **Multi-currency conversion** | Users compare prices across regions | Exchange rates change; displaying converted prices without disclosure is misleading; adds API dependency | Show native provider currency; note it clearly |

---

## Feature Dependencies

```
[Trip state (localStorage)]
    └──required by──> [Itinerary day view]
    └──required by──> [Add item to itinerary]
    └──required by──> [Contextual search]
    └──required by──> [Shareable trip link]

[Search results component]
    └──required by──> [Add to itinerary action]
    └──required by──> [Provider redirect link]

[Itinerary day view]
    └──enhanced by──> [Drag-and-drop reordering]
    └──enhanced by──> [Time-gap visualization]
    └──enhanced by──> [Contextual search]

[Flight search]
    └──parallel with──> [Hotel search]
    └──parallel with──> [Car rental search]
    └──parallel with──> [Intercity transport search]
    └──parallel with──> [Tours search]
    └──parallel with──> [Attractions search]

[Sort/filter on results]
    └──requires──> [Search results list]

[Contextual search (itinerary-driven)]
    └──requires──> [Trip state]
    └──requires──> [At least one search category]
```

### Dependency Notes

- **Trip state requires nothing:** It can be scaffolded first as a pure data layer before any search UI exists.
- **All search categories are parallel:** None depend on each other; they share a results display pattern.
- **Contextual search requires both trip state AND search:** Build after both are in place; it's a Phase 2+ feature.
- **Drag-and-drop enhances itinerary but is not required:** Can be added after the basic itinerary view is working.
- **Shareable link requires trip state but no backend:** URL encoding of localStorage state is a frontend-only feature.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Trip state (localStorage)** — all itinerary features depend on this; must be first
- [ ] **Day-by-day itinerary view** — the core product surface; this is what users are coming for
- [ ] **Manual item add/edit/delete on itinerary** — users always have items outside search results
- [ ] **Flight search with results list** — the anchor search category; highest user intent signal
- [ ] **Hotel search with results list** — always paired with flights; needed for complete trip coverage
- [ ] **Car rental search with results list** — third pillar of travel booking
- [ ] **Sort and basic filter on results** — without this, results are unusable for real decisions
- [ ] **Add search result to itinerary** — the connecting action between search and organize
- [ ] **Provider redirect (book externally)** — the monetization path and user completion action
- [ ] **Mobile-responsive layout** — non-negotiable; Angular Material provides the foundation

### Add After Validation (v1.x)

Features to add once core search + itinerary loop is working.

- [ ] **Intercity transport search (buses/trains)** — add when flight/hotel/car pattern is solid; reuses same results pattern
- [ ] **Tours search** — high value for destination planning; add when destination context exists in itinerary
- [ ] **Attractions / POI search** — completes the "what to do" layer; add alongside or after tours
- [ ] **Drag-and-drop itinerary reordering** — Polish; add when basic itinerary is validated
- [ ] **Shareable trip link** — add when users have itineraries worth sharing; requires trip state to be stable

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Contextual search (itinerary-driven search)** — high value but requires mature itinerary state model; v2 feature
- [ ] **Time-gap visualization** — nice polish; defer until itinerary UX is stable
- [ ] **Price comparison across providers** — requires multi-API aggregation; significant backend work
- [ ] **User accounts / cross-device sync** — only necessary when users demonstrate they want persistence beyond one session
- [ ] **Explore / open-ended destination discovery** — separate product surface; high engagement but high scope

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Trip state (localStorage) | HIGH | LOW | P1 |
| Day-by-day itinerary view | HIGH | MEDIUM | P1 |
| Manual item add/edit/delete | HIGH | LOW | P1 |
| Flight search | HIGH | MEDIUM | P1 |
| Hotel search | HIGH | MEDIUM | P1 |
| Results sort + filter | HIGH | MEDIUM | P1 |
| Add result to itinerary | HIGH | MEDIUM | P1 |
| Provider redirect | HIGH | LOW | P1 |
| Mobile-responsive layout | HIGH | LOW | P1 |
| Car rental search | MEDIUM | MEDIUM | P1 |
| Intercity transport search | MEDIUM | HIGH | P2 |
| Tours search | MEDIUM | HIGH | P2 |
| Attractions / POI search | MEDIUM | MEDIUM | P2 |
| Drag-and-drop reordering | MEDIUM | MEDIUM | P2 |
| Shareable trip link | MEDIUM | LOW | P2 |
| Contextual search | HIGH | HIGH | P2 |
| Time-gap visualization | LOW | MEDIUM | P3 |
| Price comparison across providers | HIGH | HIGH | P3 |
| User accounts / auth | MEDIUM | HIGH | P3 |
| Price alerts | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | TripIt | Kayak Trips | Wanderlog | Triply Approach |
|---------|--------|-------------|-----------|-----------------|
| Itinerary organization | Core feature (email parsing) | Secondary to search | Core feature (manual + import) | Manual + search-driven; no email parsing |
| Flight search | Pro feature (alerts) | Core meta-search | Links out | Direct API search, redirect to book |
| Hotel search | Organizes bookings | Core meta-search | Links out | Direct API search, redirect to book |
| Car rental | Organizes bookings | Core meta-search | Links out | Direct API search, redirect to book |
| Ground transport (trains/buses) | Limited | Limited | Via Rome2rio embed | Direct search via intercity API |
| Tours / activities | No | No | Via Viator links | Direct API search (Viator/GetYourGuide) |
| Attractions / POIs | No | No | Google Places embed | Direct POI search |
| No-login usage | Requires account | Requires account | Requires account | Yes — key differentiator |
| Shareable itinerary | Pro feature | No | Yes (requires account) | URL-encoded share (no backend) |
| Collaborative editing | Pro feature | No | Yes | No (v1) |
| Offline / mobile app | iOS + Android app | iOS + Android app | iOS + Android app | Web only (v1); responsive |
| Price tracking / alerts | Pro feature | Yes | No | No (anti-feature for v1) |

---

## Per-Category Feature Breakdown

### Flights

**Table stakes:**
- Origin, destination, date(s), passenger count, cabin class
- One-way, round-trip, and multi-city options
- Results show: airline, price, duration, stops, departure/arrival times
- Sort by price, duration, departure time
- Filter by stops (nonstop, 1 stop, any), airline, price range, departure time window
- Click-through to book on airline or OTA site

**Differentiators for Triply:**
- Show flights in context of itinerary dates (pre-populated search from trip dates)
- Multi-city search that maps to multi-destination itinerary

**Skip in v1:**
- Seat map selection
- Fare class comparison (Basic Economy vs Main Cabin)
- Price prediction ("prices are expected to drop")

### Hotels

**Table stakes:**
- Destination, check-in date, check-out date, room count, guest count
- Results show: hotel name, star rating, price per night, total price, thumbnail image
- Filter by star rating, price range, amenities (free WiFi, pool, parking)
- Sort by price, rating, distance from center
- Click-through to OTA or hotel direct

**Differentiators for Triply:**
- Auto-populate hotel search dates from itinerary trip dates
- "Add to Day X" maps hotel stay to specific itinerary days

**Skip in v1:**
- Map view with pins (high complexity, adds value but not table stakes)
- Member rates / loyalty program display
- Room type comparison

### Car Rental

**Table stakes:**
- Pick-up location, drop-off location (or same as pick-up), pick-up date/time, drop-off date/time, driver age
- Results show: car category, provider (Hertz, Avis, etc.), price, included features
- Filter by car type (economy, SUV, van), provider, price
- Click-through to provider

**Skip in v1:**
- Insurance options comparison
- GPS/child seat add-ons

### Intercity Transport (Trains / Buses)

**Table stakes:**
- Origin city, destination city, date, passenger count
- Results show: operator, duration, price, departure/arrival times, transport type (train vs bus)
- Direct link to book with operator (Omio, Rome2rio, FlixBus, etc.)

**This category is a genuine differentiator** — most travel aggregators don't include it.

### Tours and Activities

**Table stakes:**
- Destination city + date
- Results show: tour name, provider (Viator/GetYourGuide/Klook), price, duration, rating
- Filter by category (walking tour, day trip, food tour, museum), price, duration, rating
- Book link to provider

**Differentiator:** Contextual — triggered by having a destination + date in itinerary, not a standalone search.

### Attractions / POIs

**Table stakes:**
- Destination-based browse or search by name
- Results show: attraction name, category, address, rating, thumbnail, brief description
- "Add to Day X" action on itinerary

**Note:** This is not a booking flow — no redirect needed. Data is from POI APIs (Google Places, OpenTripMap, Foursquare). This makes the itinerary richer without a booking conversion.

---

## Sources

- TripIt feature set: training knowledge, well-documented product (MEDIUM confidence)
- Kayak Trips product: training knowledge (MEDIUM confidence)
- Wanderlog features: training knowledge (MEDIUM confidence)
- Rome2rio transport search: training knowledge (MEDIUM confidence)
- Viator/GetYourGuide/Klook activity booking: training knowledge (MEDIUM confidence)
- Hopper / Skyscanner Explore: training knowledge (MEDIUM confidence)
- Note: WebSearch and WebFetch unavailable during this research session; live verification of current competitor features was not possible. Feature sets for these established products are stable and unlikely to have changed materially.

---

*Feature research for: Travel planning aggregator web app (Triply)*
*Researched: 2026-02-11*
