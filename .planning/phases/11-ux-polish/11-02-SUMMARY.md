---
phase: 11-ux-polish
plan: 02
subsystem: ui-foundation
tags: [scss, design-system, card-layout, mobile-responsive]
dependency_graph:
  requires: []
  provides: [shared-card-styles, empty-state-styles]
  affects: [all-search-components]
tech_stack:
  added: []
  patterns: [global-css-classes, material-design-tokens, responsive-breakpoints]
key_files:
  created: []
  modified: [triply/src/styles.scss]
decisions: []
metrics:
  duration_minutes: 1
  tasks_completed: 1
  files_modified: 1
  completed_date: 2026-02-12
---

# Phase 11 Plan 02: Shared Card Styles Summary

Global SCSS classes for unified search result cards and empty state components, providing a single source of truth for card styling across all 6 search categories.

## What Was Built

**Shared card styling foundation for UX consistency**

Added two global CSS classes to triply/src/styles.scss that define the unified card design pattern for all search result components (flights, hotels, cars, transport, tours, attractions):

1. **.result-card** - Comprehensive card layout including:
   - Flexible header with name/info and price sections
   - Consistent metadata display with icons and separators
   - Detail rows with icon-text pairing
   - Mobile-responsive breakpoint (stacks header vertically below 600px)
   - Material Design token integration (--mat-sys-* colors, --triply-spacing-* values)

2. **.empty-state-card** - Centered empty state layout with:
   - Large icon display (48px)
   - Centered text content
   - Consistent padding and spacing

All classes use existing CSS custom properties (--mat-sys-on-surface, --triply-spacing-md, etc.) ensuring integration with the established Material 3 theme and project spacing system.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add shared SCSS classes to styles.scss | aa046ee | triply/src/styles.scss |

## Technical Implementation

**Global CSS Class Pattern**

Angular component styles are encapsulated by default, which prevents traditional SCSS mixins from being shared across components via @use/@import. The solution is to define global utility classes in the root styles.scss file that components can reference via class attributes on their mat-card elements.

**Class Structure**

```scss
.result-card {
  margin-bottom: var(--triply-spacing-md);

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    // ...
  }

  .result-info { flex: 1; }
  .result-name { /* Typography styles */ }
  .result-meta { /* Icon + text layout */ }
  .result-price { /* Right-aligned pricing */ }
  .result-details { /* Vertical detail rows */ }

  @media (max-width: 600px) {
    .result-header {
      flex-direction: column;
      // Stack vertically on mobile
    }
  }
}
```

**Design Token Integration**

Uses Material 3 semantic color tokens:
- `--mat-sys-on-surface` - Primary text color
- `--mat-sys-on-surface-variant` - Secondary text color
- `--mat-sys-primary` - Accent color (prices)
- `--mat-sys-outline` - Border/separator color

Uses project spacing tokens:
- `--triply-spacing-sm/md/lg/xl` - Consistent spacing scale

**Responsive Design**

Single breakpoint at 600px (Material Design mobile threshold):
- Desktop: horizontal flex layout with price on right
- Mobile: vertical stack layout for better readability

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. **Build Success**: `npx ng build --configuration=development` completed without errors
2. **Class Existence**: Both .result-card and .empty-state-card present in styles.scss
3. **Sub-classes**: All expected nested classes verified (.result-header, .result-info, .result-price, .result-meta, .result-details, .result-name, .empty-icon)
4. **Responsive Breakpoint**: @media (max-width: 600px) rule present
5. **Existing Content Preserved**: mat.theme() and :root tokens unchanged

## Files Modified

### triply/src/styles.scss
- Added .result-card class (114 lines)
- Added .empty-state-card class
- No modifications to existing mat.theme() or :root definitions

## Integration Points

**Downstream consumers (plans 11-03, 11-04):**
- Flight search component
- Hotel search component
- Car rental search component
- Transport search component
- Tour search component
- Attraction search component

Each component will apply the `.result-card` class to their mat-card elements and use the nested sub-classes (.result-header, .result-info, etc.) in their templates to achieve visual consistency.

**Empty state consumers:**
All search components will apply `.empty-state-card` class to mat-card elements displaying "no results" messages.

## Next Steps

**Plan 11-03**: Apply .result-card to flight, hotel, and car search components
**Plan 11-04**: Apply .result-card to transport, tour, and attraction search components

Both plans will consume the global classes defined here, ensuring all 6 search categories share identical card styling without code duplication.

## Self-Check: PASSED

**Files created:**
- PASSED: .planning/phases/11-ux-polish/11-02-SUMMARY.md (this file)

**Files modified:**
```bash
$ [ -f "C:/Users/Pichau/triply/src/styles.scss" ] && echo "FOUND: triply/src/styles.scss" || echo "MISSING: triply/src/styles.scss"
FOUND: triply/src/styles.scss
```

**Commits exist:**
```bash
$ git log --oneline --all | grep -q "aa046ee" && echo "FOUND: aa046ee" || echo "MISSING: aa046ee"
FOUND: aa046ee
```

All claims verified successfully.
