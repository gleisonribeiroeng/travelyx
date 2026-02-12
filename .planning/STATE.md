# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** O usuario sai do zero ao roteiro completo em uma unica sessao — buscando voos, hotel, passeios e atracoes, adicionando tudo a um timeline organizado por dia e horario, sem criar conta.
**Current focus:** Phase 2 — API Integration Layer

## Current Position

Phase: 2 of 11 (API Integration Layer)
Plan: 2 of 7 in current phase
Status: In progress
Last activity: 2026-02-12 — Plans 02-01 and 02-02 complete

Progress: [█░░░░░░░░░] 11%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 3 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 12 min | 3 min |
| 02-api-integration-layer | 2/7 | 2 min | 1 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-02, 01-03, 01-04, 02-01, 02-02
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
- 02-02: Transport API proxy entry uses placeholder https://api.example.com — Rome2rio unavailable, provider TBD before Phase 7
- 02-02: Hotels and cars share same RapidAPI proxy host — path differentiation handled in service layer

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: CORS status and access model for Amadeus, Rome2rio, Viator, OpenTripMap must be validated live — training data claims are LOW confidence
- Phase 8: Viator partner API may require a partnership application with lead time — investigate early before Phase 8 begins

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 02-02-PLAN.md — Angular dev proxy configured, ready for 02-03
Resume file: None
