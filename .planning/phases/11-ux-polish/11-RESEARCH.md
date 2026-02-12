# Phase 11: UX Polish - Research

**Researched:** 2026-02-12
**Domain:** Angular UX patterns, Material Design UI polish, responsive design
**Confidence:** HIGH

## Summary

Phase 11 focuses on production-ready UX polish across all views: per-source loading states, comprehensive empty states, scoped error handling, mobile responsiveness, visual consistency, and clear navigation hierarchy. The existing codebase already has strong foundations (LoadingService with per-source tracking, error interceptor with AppError normalization, isSearching/hasSearched signals in all search components, empty state blocks in some components, and responsive breakpoints in 2/6 search components). The primary work involves extending these patterns consistently across all 6 search categories and the itinerary view, plus adding per-source error banners and conducting a mobile audit.

Angular Material 21 with Material Design 3 provides all necessary components (mat-progress-spinner, mat-card for empty states, and the design token system for consistent styling). The Angular CDK BreakpointObserver provides programmatic responsive layout control beyond CSS media queries. No new npm packages are required — all functionality can be achieved with existing @angular/material and @angular/cdk dependencies.

**Primary recommendation:** Leverage existing LoadingService and AppError infrastructure to add per-source loading/error UI, extend existing empty state patterns to all components, conduct systematic mobile audit using 375px breakpoint, create shared SCSS mixins for card consistency, and use mat-raised-button with color="primary" for all "Add to itinerary" actions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @angular/material | 21.1.3 | UI component library with Material Design 3 | Official Angular Material with M3 design tokens, used throughout existing codebase |
| @angular/cdk | 21.1.3 | Component Dev Kit with Layout utilities | Provides BreakpointObserver for programmatic responsive design beyond CSS |
| @angular/animations | 21.1.3 | Animation engine | Required by Material components for transitions and state changes |
| RxJS | 7.8.0 | Reactive programming | Used for loading state management via finalize() operator |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Angular Signals | Built-in (21.1.0) | Reactive state management | Already used for isSearching, hasSearched, searchResults in all components |
| CSS Custom Properties | Native | Design tokens | Angular Material 21 uses --mat-sys-* tokens, existing --triply-spacing-* tokens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mat-progress-spinner | ngx-skeleton-loader | Skeletons provide better perceived performance but add dependency; spinner already imported |
| CSS @media queries | BreakpointObserver only | CDK needed when logic must change, not just CSS; use media queries first, BreakpointObserver when necessary |
| mat-snack-bar | Custom banner component | Snackbar is transient (for success), banner is persistent (for errors); both have use cases |

**Installation:**
```bash
# No new packages required — all dependencies already in package.json
# Angular Material 21.1.3 and Angular CDK 21.1.3 are already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   ├── services/
│   │   └── loading.service.ts           # Already exists: per-source loading tracking
│   ├── api/
│   │   ├── interceptors/
│   │   │   └── error.interceptor.ts     # Already exists: AppError normalization
│   │   └── models/
│   │       └── app-error.model.ts       # Already exists: source field for per-source errors
│   └── components/
│       └── error-banner/                # NEW: Reusable per-source error banner
│           ├── error-banner.component.ts
│           ├── error-banner.component.html
│           └── error-banner.component.scss
├── features/
│   ├── [category]-search/               # 6 search components
│   │   ├── [category]-search.component.ts      # Add: error signal, banner usage
│   │   ├── [category]-search.component.html    # Add: per-source error banner, empty state
│   │   └── [category]-search.component.scss    # Add/extend: mobile breakpoints, card consistency
│   └── itinerary/
│       ├── itinerary.component.html     # Already has empty state
│       └── itinerary.component.scss     # Audit: mobile responsiveness
└── styles.scss                           # Shared: card mixin, responsive utilities
```

### Pattern 1: Per-Source Loading State

**What:** Each search component shows loading indicator during its own search, not a global spinner that blocks the entire page.

**When to use:** Every search operation across all 6 categories.

**Example:**
```typescript
// Component TS (ALREADY EXISTS in all search components)
isSearching = signal(false);

searchHotels(): void {
  this.isSearching.set(true);
  this.hotelApi.searchHotels(params)
    .pipe(finalize(() => this.isSearching.set(false)))  // Guarantees reset on success or error
    .subscribe({ next: (result) => { ... } });
}
```

```html
<!-- Component HTML (ALREADY EXISTS in tour-search and attraction-search) -->
@if (isSearching()) {
  <button mat-raised-button color="primary" [disabled]="true">
    <mat-spinner diameter="20"></mat-spinner>
    <span>Searching...</span>
  </button>
} @else {
  <button mat-raised-button color="primary" type="submit">
    <mat-icon>search</mat-icon>
    <span>Search</span>
  </button>
}
```

**Source:** Existing codebase pattern in tour-search.component.html lines 21-43

### Pattern 2: Empty States with Clear Guidance

**What:** When search returns zero results or itinerary is empty, show mat-card with icon and helpful message.

**When to use:** After search completes with no results, or when itinerary has no items.

**Example:**
```html
<!-- Search Empty State (ALREADY EXISTS in tour-search and attraction-search) -->
@if (searchResults().length === 0 && !isSearching() && hasSearched()) {
  <mat-card class="empty-state">
    <mat-card-content>
      <mat-icon>local_activity</mat-icon>
      <p>No tours found. Try a different destination.</p>
    </mat-card-content>
  </mat-card>
}

<!-- Itinerary Empty State (ALREADY EXISTS in itinerary.component.html) -->
@else {
  <mat-card class="empty-state">
    <mat-card-content>
      <mat-icon class="empty-icon">map</mat-icon>
      <p>Your itinerary is empty. Add items from the search pages to start building your trip.</p>
    </mat-card-content>
  </mat-card>
}
```

**Source:** Existing codebase patterns in tour-search.component.html lines 98-105 and itinerary.component.html lines 31-38

### Pattern 3: Per-Source Error Banners (NEW)

**What:** When an API source fails, show a dismissible error banner specific to that source — other sources still display their results.

**When to use:** When result.error is non-null from withFallback pattern (already used in all ApiService methods).

**Example:**
```typescript
// Component TS (NEW pattern to add)
errorMessage = signal<string | null>(null);
errorSource = signal<string | null>(null);

searchHotels(): void {
  this.isSearching.set(true);
  this.errorMessage.set(null);  // Clear previous errors

  this.hotelApi.searchHotels(params)
    .pipe(finalize(() => this.isSearching.set(false)))
    .subscribe({
      next: (result) => {
        if (result.error) {
          this.errorMessage.set(result.error.message);
          this.errorSource.set(result.error.source);
          this.searchResults.set([]); // Fallback data
        } else {
          this.searchResults.set(result.data);
        }
      }
    });
}

dismissError(): void {
  this.errorMessage.set(null);
  this.errorSource.set(null);
}
```

```html
<!-- Component HTML (NEW) -->
@if (errorMessage()) {
  <mat-card class="error-banner">
    <mat-card-content>
      <div class="error-content">
        <mat-icon color="warn">error</mat-icon>
        <div class="error-text">
          <strong>{{ errorSource() }} Error</strong>
          <p>{{ errorMessage() }}</p>
        </div>
        <button mat-icon-button (click)="dismissError()" aria-label="Dismiss error">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </mat-card-content>
  </mat-card>
}
```

**Source:** Pattern adapted from existing AppError model (app-error.model.ts) and Material Design error guidelines

### Pattern 4: Mobile-Responsive Breakpoints

**What:** Use CSS @media (max-width: 600px) for layout adjustments, BreakpointObserver when component logic must change.

**When to use:** All components with multi-column layouts, form rows, or horizontal scrolling.

**Example:**
```scss
// SCSS (ALREADY EXISTS in tour-search and transport-search)
.form-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  mat-form-field {
    flex: 1;
    min-width: 200px;
  }
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;

    mat-form-field {
      min-width: 100%;
    }
  }

  .tour-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--triply-spacing-sm);
  }
}
```

**Source:** Existing codebase patterns in tour-search.component.scss lines 156-170

### Pattern 5: Unified Card Design Across Categories

**What:** All 6 search result cards share identical Angular Material card structure and spacing.

**When to use:** Every result card in hotel, car, transport, tour, attraction, and general search.

**Example:**
```scss
// Shared SCSS mixin (NEW — create in styles.scss)
@mixin result-card {
  margin-bottom: var(--triply-spacing-md);

  mat-card-content {
    padding: var(--triply-spacing-md);
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--triply-spacing-md);
  }

  .result-info {
    flex: 1;
  }

  .result-price {
    text-align: right;

    .amount {
      font-size: 1.4rem;
      font-weight: bold;
      color: var(--mat-sys-primary);
    }

    .price-label {
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
  }

  @media (max-width: 600px) {
    .result-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--triply-spacing-sm);
    }
  }
}

// Component SCSS
.tour-card {
  @include result-card;
}
```

**Source:** Pattern derived from existing tour-search.component.scss lines 61-93

### Pattern 6: Primary Action Prominence

**What:** "Add to itinerary" button is always mat-raised-button with color="primary", positioned first in mat-card-actions.

**When to use:** Every result card across all 6 categories.

**Example:**
```html
<!-- ALREADY EXISTS in tour-search, needs consistency audit -->
<mat-card-actions>
  <button mat-raised-button color="primary" (click)="addToItinerary(item)">
    <mat-icon>add</mat-icon>
    Add to Itinerary
  </button>
  <a mat-button [href]="item.link.url" target="_blank">
    <mat-icon>open_in_new</mat-icon>
    View Details
  </a>
</mat-card-actions>
```

**Why:** mat-raised-button with filled background and elevation draws attention, color="primary" uses theme's primary color, mat-button (text-only) for secondary actions creates clear visual hierarchy.

**Source:** Material Design button hierarchy guidelines and existing tour-search.component.html lines 82-91

### Anti-Patterns to Avoid

- **Global loading spinner:** Blocks entire page when only one source is loading; use per-component isSearching signal instead
- **Snackbar for persistent errors:** Snackbar auto-dismisses; use mat-card banner for errors that need explicit dismissal
- **Fixed pixel breakpoints everywhere:** Overcomplicates code; use CSS media queries first, BreakpointObserver only when logic changes
- **Inconsistent card structures:** Confuses users; establish shared mixin and apply to all 6 categories
- **mat-button for primary actions:** Lacks visual weight; use mat-raised-button color="primary" for "Add to itinerary"

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading spinners | Custom CSS animation | mat-progress-spinner with diameter="20" | Already themed, accessible, size-adjustable |
| Empty state layouts | Div soup | mat-card with mat-icon | Consistent elevation, padding, Material theming |
| Responsive breakpoints | window.innerWidth listeners | CSS @media queries + Angular CDK BreakpointObserver | CSS handles most cases; BreakpointObserver for logic changes |
| Design tokens | Hard-coded colors/spacing | --mat-sys-* and --triply-spacing-* CSS variables | Theme consistency, easy global updates |
| Error normalization | Component-level try/catch | errorInterceptor with AppError model | Already implemented, handles all HTTP errors |

**Key insight:** Angular Material 21 provides production-ready, accessible, themeable components for every UX polish need. The existing codebase already has the core patterns — this phase extends them consistently.

## Common Pitfalls

### Pitfall 1: Forgetting finalize() for Loading State

**What goes wrong:** If error occurs before setting isSearching to false, spinner never stops.

**Why it happens:** Using .subscribe({ next, error }) separately instead of finalize() which always runs.

**How to avoid:** Always use .pipe(finalize(() => this.isSearching.set(false))) before .subscribe().

**Warning signs:** Spinner stuck on screen after error; check if finalize() is used.

### Pitfall 2: Empty State Showing Before First Search

**What goes wrong:** "No results found" appears immediately on page load, before user searches.

**Why it happens:** Condition only checks searchResults().length === 0, not hasSearched() flag.

**How to avoid:** Empty state condition MUST include: searchResults().length === 0 && !isSearching() && hasSearched().

**Warning signs:** Empty state visible on initial page load; add hasSearched signal.

### Pitfall 3: Snackbar for Error Recovery

**What goes wrong:** Error message disappears after duration, user can't retry or dismiss explicitly.

**Why it happens:** Using mat-snack-bar for all error types, including recoverable failures.

**How to avoid:** Use snackbar for success/transient messages, mat-card banner for persistent errors with dismiss button.

**Warning signs:** Users complain errors disappear too quickly; switch to dismissible banner.

### Pitfall 4: Mobile Overflow from Fixed Widths

**What goes wrong:** Horizontal scrollbar on mobile, text/buttons cut off at 375px viewport.

**Why it happens:** Using min-width: 200px without wrapping flex container or max-width constraint.

**How to avoid:** Use flex-wrap: wrap on containers, min-width: 100% inside mobile breakpoint, test at 375px.

**Warning signs:** Horizontal scroll on mobile; audit all min-width and fixed pixel widths.

### Pitfall 5: Inconsistent Button Variants

**What goes wrong:** Some "Add to itinerary" buttons use mat-button, others mat-flat-button, creates confusing hierarchy.

**Why it happens:** Copy-paste from different examples without visual hierarchy plan.

**How to avoid:** Establish rule: mat-raised-button color="primary" for primary action, mat-button for secondary.

**Warning signs:** Multiple button styles for same action; create shared template pattern.

## Code Examples

Verified patterns from official sources and existing codebase:

### Loading State with Finalize

```typescript
// Source: RxJS finalize operator + existing tour-search pattern
import { finalize } from 'rxjs/operators';

isSearching = signal(false);

searchHotels(): void {
  this.isSearching.set(true);

  this.hotelApi.searchHotels(params)
    .pipe(finalize(() => this.isSearching.set(false)))  // Always runs
    .subscribe({
      next: (result) => {
        if (result.error) {
          // Handle error
        } else {
          this.searchResults.set(result.data);
        }
      }
    });
}
```

### Per-Source Error Banner Component

```typescript
// NEW: Reusable error banner component
import { Component, input, output } from '@angular/core';
import { MATERIAL_IMPORTS } from '../material.exports';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [MATERIAL_IMPORTS],
  template: `
    <mat-card class="error-banner">
      <mat-card-content>
        <div class="error-content">
          <mat-icon color="warn">error</mat-icon>
          <div class="error-text">
            <strong>{{ source() }} Error</strong>
            <p>{{ message() }}</p>
          </div>
          <button mat-icon-button (click)="dismiss.emit()" aria-label="Dismiss error">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .error-banner {
      background-color: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      margin-bottom: var(--triply-spacing-md);
    }

    .error-content {
      display: flex;
      align-items: flex-start;
      gap: var(--triply-spacing-sm);
    }

    .error-text {
      flex: 1;

      strong {
        display: block;
        margin-bottom: 4px;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
      }
    }

    mat-icon[color="warn"] {
      color: var(--mat-sys-error);
    }
  `]
})
export class ErrorBannerComponent {
  source = input.required<string>();
  message = input.required<string>();
  dismiss = output<void>();
}
```

### Empty State Pattern

```html
<!-- Source: Material Design empty state guidelines + existing itinerary pattern -->
@if (searchResults().length === 0 && !isSearching() && hasSearched()) {
  <mat-card class="empty-state">
    <mat-card-content>
      <mat-icon>hotel</mat-icon>
      <p>No hotels found. Try different dates or location.</p>
    </mat-card-content>
  </mat-card>
}
```

### Responsive Breakpoint with BreakpointObserver

```typescript
// Source: Angular CDK Layout documentation
// Use ONLY when component logic must change, not just CSS
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { inject, signal } from '@angular/core';

export class MyComponent {
  private breakpointObserver = inject(BreakpointObserver);
  isMobile = signal(false);

  constructor() {
    this.breakpointObserver
      .observe([Breakpoints.HandsetPortrait])
      .subscribe(result => {
        this.isMobile.set(result.matches);
      });
  }

  // Use isMobile() to conditionally render different components or change behavior
}
```

### Unified Card Mixin

```scss
// Source: Derived from existing tour-search and transport-search patterns
// NEW: Add to styles.scss for consistency
@mixin search-result-card {
  margin-bottom: var(--triply-spacing-md);

  mat-card-content {
    padding: var(--triply-spacing-md);
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--triply-spacing-md);

    .result-info {
      flex: 1;
    }

    .result-price {
      text-align: right;

      .amount {
        font-size: 1.4rem;
        font-weight: bold;
        color: var(--mat-sys-primary);
      }

      .price-label {
        font-size: 0.8rem;
        color: var(--mat-sys-on-surface-variant);
      }
    }
  }

  .result-name {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0 0 var(--triply-spacing-sm) 0;
    color: var(--mat-sys-on-surface);
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--mat-sys-on-surface-variant);

    mat-icon {
      font-size: 18px;
      height: 18px;
      width: 18px;
    }

    .separator {
      color: var(--mat-sys-outline);
    }
  }

  @media (max-width: 600px) {
    .result-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--triply-spacing-sm);
    }
  }
}

// Usage in component SCSS
.hotel-card {
  @include search-result-card;
}
```

### Primary Action Button Hierarchy

```html
<!-- Source: Material Design button guidelines -->
<mat-card-actions>
  <!-- PRIMARY: Raised button with color -->
  <button mat-raised-button color="primary" (click)="addToItinerary(item)">
    <mat-icon>add</mat-icon>
    Add to Itinerary
  </button>

  <!-- SECONDARY: Text button, no color -->
  <a mat-button [href]="item.link.url" target="_blank">
    <mat-icon>open_in_new</mat-icon>
    View Details
  </a>
</mat-card-actions>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global loading spinner | Per-source loading indicators | Angular Signals (v16+) | Users see which API is slow, can interact with loaded content |
| Spinner-only loading | Skeleton screens | Material Design 3 | Better perceived performance, less jarring |
| window.innerWidth | BreakpointObserver + CSS @media | Angular CDK Layout | Cleaner code, reactive to orientation changes |
| Hard-coded colors | CSS custom properties (--mat-sys-*) | Material Design 3 tokens | Theme consistency, easier customization |
| NgModules | Standalone components | Angular 14+ | Smaller bundles, simpler imports (already used in triply) |

**Deprecated/outdated:**
- **Global spinner that blocks entire page:** Use per-component isSearching signals instead
- **mat-spinner without diameter:** Specify diameter (e.g., 20) for inline button spinners
- **Color names like "primary" in SCSS:** Use --mat-sys-primary design tokens instead

## Open Questions

1. **Should we add skeleton screens instead of spinners?**
   - What we know: Skeletons provide better perceived performance, but require ngx-skeleton-loader or custom implementation
   - What's unclear: Whether additional dependency is worth it for this phase
   - Recommendation: Use existing mat-progress-spinner for now; defer skeleton screens to future enhancement

2. **Should error banners auto-dismiss after timeout?**
   - What we know: Material Design recommends persistent banners for errors requiring user action, transient snackbars for info
   - What's unclear: User preference for dismissal vs. timeout
   - Recommendation: Make banners dismissible only (no auto-timeout), reserve snackbar for success messages

3. **Should we use BreakpointObserver or CSS @media for mobile layout?**
   - What we know: CSS @media handles most responsive layout needs; BreakpointObserver needed when component logic must change
   - What's unclear: Whether any components need logic-based breakpoints
   - Recommendation: Audit all components; use CSS @media first, add BreakpointObserver only if logic must change based on screen size

## Sources

### Primary (HIGH confidence)
- Angular Material 21 official documentation - Component APIs and theming
- Angular CDK Layout documentation - BreakpointObserver API
- Existing triply codebase - LoadingService, errorInterceptor, search component patterns
- Material Design 3 Guidelines - Empty states, error patterns, button hierarchy

### Secondary (MEDIUM confidence)
- [Angular Material UI Component Library](https://material.angular.dev/components/snack-bar) - Snackbar and button components
- [Angular CDK BreakpointObserver](https://material.angular.dev/cdk/layout/api) - Responsive layout API
- [Material Design Cards Guidelines](https://m3.material.io/components/cards/guidelines) - Card design patterns
- [Angular Material Theming Guide](https://material.angular.dev/guide/theming) - Design token system
- [Simple Angular Material Customization with Design Tokens](https://perko.dev/blog/post/2024-11-11-simple-angular-material-customization/) - Token customization patterns
- [Angular Material 3 Theming: Design Tokens and System Variables](https://konstantin-denerz.com/angular-material-3-theming-design-tokens-and-system-variables/) - Token usage
- [Angular Responsive Design: Complete Guide](https://blog.angular-university.io/angular-responsive-design/) - Breakpoint best practices
- [Angular Loading Indicator: Complete Guide](https://blog.angular-university.io/angular-loading-indicator/) - Per-source loading patterns
- [Material Design Empty States](https://m2.material.io/design/communication/empty-states.html) - Empty state design guidelines
- [Material Design Errors](https://m1.material.io/patterns/errors.html) - Error handling patterns

### Tertiary (LOW confidence)
- [ngx-skeleton-loader npm package](https://www.npmjs.com/package/ngx-skeleton-loader) - Alternative loading approach (not used)
- [Ignite UI Angular Banner Component](https://www.infragistics.com/products/ignite-ui-angular/angular/components/banner) - Third-party alternative (not needed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, versions confirmed in package.json
- Architecture: HIGH - Patterns verified in existing codebase files
- Pitfalls: MEDIUM - Derived from common Angular Material issues and existing code review

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days — Angular Material and CDK are stable APIs)
