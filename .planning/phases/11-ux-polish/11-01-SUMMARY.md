---
phase: 11-ux-polish
plan: 01
subsystem: ui
tags: [angular, material-design, error-handling, signals, standalone-components]

# Dependency graph
requires:
  - phase: 02-api-integration-layer
    provides: AppError model with source field for per-source error attribution
  - phase: 01-foundation
    provides: MATERIAL_IMPORTS barrel export and Angular Material component library
provides:
  - ErrorBannerComponent - reusable per-source error banner with dismiss capability
  - Signal-based component pattern with input.required() and output() APIs
  - Material Design error card styling with design tokens
affects: [12-integration-testing, all-search-components, itinerary-component]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single-file standalone component with inline template and styles
    - Signal-based input.required<T>() and output<T>() APIs
    - Material Design error container theming with --mat-sys-error-container tokens
    - Mobile-responsive gap reduction via @media (max-width: 600px)

key-files:
  created:
    - triply/src/app/shared/components/error-banner/error-banner.component.ts
  modified: []

key-decisions:
  - "Single-file component pattern with inline template/styles for simplicity"
  - "Signal-based input/output APIs (not @Input/@Output decorators) following Angular 21 best practices"
  - "Material Design error color tokens (--mat-sys-error-container) for theme consistency"
  - "Dismissible only (no auto-timeout) to match Material Design persistent error pattern"

patterns-established:
  - "Shared component directory: triply/src/app/shared/components/ for reusable UI elements"
  - "Error banner accepts source and message inputs, emits dismiss event for component-controlled state"
  - "Mobile responsiveness via CSS custom property gap adjustments at 600px breakpoint"

# Metrics
duration: 1min
completed: 2026-02-12
---

# Phase 11 Plan 01: ErrorBannerComponent Summary

**Reusable standalone error banner component with signal-based APIs, Material Design error styling, and dismiss capability**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-12T20:29:49Z
- **Completed:** 2026-02-12T20:31:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created ErrorBannerComponent as single-file standalone component with inline template and styles
- Implemented signal-based input.required() and output() APIs following Angular 21 best practices
- Applied Material Design error theming with --mat-sys-error-container and --mat-sys-on-error-container tokens
- Added mobile-responsive layout with reduced gap on screens ≤600px

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ErrorBannerComponent with inline template and styles** - `e0b93bd` (feat)

## Files Created/Modified
- `triply/src/app/shared/components/error-banner/error-banner.component.ts` - Standalone error banner component accepting source/message inputs, emitting dismiss event, with Material card, icon, and close button

## Decisions Made
- **Single-file component pattern:** Inline template and styles keep component self-contained and simple (vs. separate HTML/SCSS files) — appropriate for small, reusable UI element
- **Signal-based APIs:** Used input.required<string>() and output<void>() instead of @Input/@Output decorators to follow Angular 21 signal-based component pattern established in existing codebase
- **Material Design error tokens:** Used --mat-sys-error-container background and --mat-sys-error for icon color to ensure theme consistency across light/dark modes
- **No auto-dismiss:** Banner is dismissible only via close button (no timeout) following Material Design guidelines for persistent errors requiring user acknowledgment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

ErrorBannerComponent is ready for import by all 6 search components (flights, hotels, car-rental, transport, tours, attractions) in plans 11-02 through 11-06. The component provides:

- Type-safe signal-based APIs (input.required ensures source and message are always provided)
- Themeable error styling via Material Design tokens (adapts to custom themes automatically)
- Mobile-responsive layout (gap reduces from --triply-spacing-sm to --triply-spacing-xs on small screens)
- Accessible close button with aria-label

No blockers for next plan.

## Self-Check: PASSED

All claims verified:
- ✅ File exists: triply/src/app/shared/components/error-banner/error-banner.component.ts
- ✅ Commit exists: e0b93bd

---
*Phase: 11-ux-polish*
*Completed: 2026-02-12*
