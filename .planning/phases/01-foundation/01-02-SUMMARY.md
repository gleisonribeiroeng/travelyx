---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [angular, angular-material, material3, scss, design-tokens, m3-theme]

# Dependency graph
requires:
  - phase: 01-01
    provides: Angular 21 standalone project in triply/ with build infrastructure
provides:
  - Angular Material 21.1.3 installed with M3 theme via mat.theme() mixin
  - --mat-sys-* CSS custom properties generated on html element
  - Custom spacing and border-radius design tokens in :root
  - provideAnimationsAsync() configured for Material component animations
  - Shared MATERIAL_IMPORTS array in core/material.exports.ts (14 modules)
affects:
  - 01-03 (global styles extend this M3 theme foundation)
  - 01-04 (TripStateService UI may use Material components via MATERIAL_IMPORTS)
  - All phase 4-9 feature components (use MATERIAL_IMPORTS for Material components)

# Tech tracking
tech-stack:
  added: [
    "@angular/material@21.1.3",
    "@angular/cdk@21.1.3",
    "@angular/animations@21.1.3"
  ]
  patterns:
    - M3 theme configuration via mat.theme() SCSS mixin (not prebuilt CSS)
    - Centralized Material imports via MATERIAL_IMPORTS array in core/material.exports.ts
    - provideAnimationsAsync() for lazy-loaded animation bundles

key-files:
  created:
    - triply/src/app/core/material.exports.ts
  modified:
    - triply/src/styles.scss
    - triply/src/app/app.config.ts
    - triply/package.json
    - triply/src/index.html

key-decisions:
  - "Used mat.theme() SCSS mixin instead of prebuilt theme CSS — generates --mat-sys-* tokens at build time"
  - "provideAnimationsAsync() chosen over provideAnimations() — async loads animation bundle lazily"
  - "@angular/animations had to be installed manually — ng add schematic did not include it in Angular 21"

patterns-established:
  - "Material theming: mat.theme() mixin in styles.scss, not @import of prebuilt CSS"
  - "Feature components import MATERIAL_IMPORTS from core/material.exports instead of individual modules"
  - "Custom design tokens use --triply-* prefix to distinguish from --mat-sys-* Material tokens"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 1 Plan 02: Angular Material 3 Setup Summary

**Angular Material 21.1.3 integrated with M3 theme via mat.theme() mixin generating --mat-sys-* tokens, custom --triply-* spacing/layout tokens, async animations, and 14-module MATERIAL_IMPORTS re-export**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-11T17:20:59Z
- **Completed:** 2026-02-11T17:22:42Z
- **Tasks:** 2 of 2
- **Files modified:** 5

## Accomplishments

- Angular Material 21.1.3, CDK, and Animations packages installed
- M3 theme configured in `styles.scss` with `mat.theme()` mixin — azure primary, blue tertiary, light color scheme
- Custom project tokens defined: `--triply-spacing-*` (xs/sm/md/lg/xl), `--triply-border-radius-*`, `--triply-max-content-width`
- `provideAnimationsAsync()` added to `app.config.ts` providers
- `core/material.exports.ts` created with `MATERIAL_IMPORTS` array of 14 commonly used Material modules
- Project builds cleanly with zero errors (1.6 seconds build time)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Angular Material 3 and configure M3 theme** - `3e00f70` (feat)
2. **Task 2: Create shared Material component re-export file** - `611e2a0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `triply/src/styles.scss` — M3 theme via mat.theme(), --triply-* custom tokens, body typography
- `triply/src/app/app.config.ts` — Added provideAnimationsAsync() to providers
- `triply/src/app/core/material.exports.ts` — MATERIAL_IMPORTS array with 14 Material modules
- `triply/package.json` — Added @angular/material, @angular/cdk, @angular/animations
- `triply/src/index.html` — Google Fonts Roboto link added by schematic

## Decisions Made

- **mat.theme() over prebuilt CSS:** The M3 theme is generated at build time via the SCSS mixin, which makes all `--mat-sys-*` CSS custom properties available for customization. Prebuilt themes are static and don't expose these tokens.
- **provideAnimationsAsync() over provideAnimations():** Async version lazy-loads the animations bundle only when needed, improving initial load performance. The synchronous version is deprecated.
- **@angular/animations manual install:** The `ng add @angular/material` schematic in Angular 21 does not automatically install `@angular/animations`. Build failed with a bundle resolution error — installed manually as a Rule 3 (blocking) fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @angular/animations package**
- **Found during:** Task 1 (post-schematic build verification)
- **Issue:** `ng add @angular/material` in Angular 21 does not install `@angular/animations`. Build failed: `Could not resolve "@angular/animations/browser"` from `provideAnimationsAsync()` import
- **Fix:** Ran `npm install @angular/animations@21` to install the missing peer dependency
- **Files modified:** triply/package.json, triply/package-lock.json
- **Verification:** `npx ng build` passed after install
- **Committed in:** `3e00f70` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing peer dependency)
**Impact on plan:** Required fix for `provideAnimationsAsync()` to function. No scope creep.

## Issues Encountered

- Angular 21 `ng add @angular/material` schematic did not add `provideAnimationsAsync()` to `app.config.ts` — added manually as specified in the plan's post-schematic corrections.
- The schematic generated a valid M3 theme in styles.scss but without `theme-type: light` and without the custom `--triply-*` tokens — replaced entirely with plan-specified content.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Angular Material M3 theme active globally — all Material components will render with M3 design tokens
- `MATERIAL_IMPORTS` ready for feature components to use in their `imports` array
- Custom spacing tokens available throughout the app via CSS custom properties
- Ready for Plan 01-03: global styles and layout shell
- No blockers

---
*Phase: 01-foundation*
*Completed: 2026-02-11*

## Self-Check: PASSED

All 4 key files found on disk. Both task commits (3e00f70, 611e2a0) verified in git log.
