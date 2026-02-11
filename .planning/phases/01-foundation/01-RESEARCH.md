# Phase 1: Foundation - Research

**Researched:** 2026-02-11
**Domain:** Angular 19+ standalone app scaffold, Angular Material 3, routing, environment config, design tokens
**Confidence:** HIGH

---

## Summary

Phase 1 establishes the Angular application shell for Triply — an Angular 17+ travel planner. The Angular ecosystem has converged on a clear, stable approach for 2025: standalone components are the default since Angular 19, signals are the production-ready reactive primitive, and Angular Material 3 (M3) drives the design system via CSS custom properties (design tokens). All three are well-documented with official APIs.

The project structure follows a feature-first layout (`features/`, `core/`, no `shared/` dumping ground). Routing uses `provideRouter()` with `loadComponent` for lazy loading. The environment system uses Angular CLI's `ng generate environments` + `fileReplacements` in `angular.json` — no external secret management needed for Phase 1 since only placeholder slots are required. Angular Material 3 theming is applied through the `mat.theme()` SCSS mixin that generates `--mat-sys-*` CSS custom properties, which serve as the design token foundation for spacing, typography, and color.

No CONTEXT.md exists for this phase, meaning all implementation choices are at Claude's discretion. The roadmap confirms Angular 17+ and Angular Material are locked-in decisions.

**Primary recommendation:** Scaffold with `ng new --standalone --routing --style=scss --strict`, immediately run `ng add @angular/material`, configure the M3 theme in `styles.scss` with `mat.theme()`, then wire layout shell and routes before touching environment files.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@angular/core` | 19+ | Framework, standalone components, signals | Default since v17; standalone is default in v19+ |
| `@angular/router` | 19+ | Client-side routing, lazy loading | Bundled with Angular, `provideRouter()` + `loadComponent` is canonical |
| `@angular/material` | 19+ | UI component library, design system | Project requirement; M3 token system avoids hand-rolling design |
| `@angular/cdk` | 19+ | Component Dev Kit (auto-installed with Material) | Required peer dep; provides overlay, a11y, layout utilities |
| `@angular/platform-browser` | 19+ | DOM bootstrapping | Required; `bootstrapApplication()` lives here |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@angular/animations` | 19+ | Material component animations | Required for Angular Material components that animate |
| `rxjs` | 7.x | Observable streams (bundled with Angular) | Needed for toSignal() bridge in later phases; imported automatically |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Angular Material (M3) | Tailwind CSS + custom components | Material gives pre-built a11y-compliant components with token system; Tailwind requires hand-building every component |
| Angular Material (M3) | PrimeNG, NG-ZORRO | Material is the project requirement; alternatives not applicable |
| SCSS | CSS | SCSS is required for `@use '@angular/material' as mat` theming mixins; plain CSS cannot use the `mat.theme()` SCSS API |

**Installation:**
```bash
# Step 1: Scaffold (Angular 19+ defaults: --standalone=true, --strict=true)
ng new triply --standalone --routing --style=scss --strict

# Step 2: Add Angular Material (runs schematic: installs @angular/material, @angular/cdk, @angular/animations)
ng add @angular/material
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── core/                    # Singleton services, guards, interceptors, global tokens
│   │   ├── components/          # App-level layout (header, footer, shell)
│   │   ├── services/            # TripStateService (Phase 3), global singletons
│   │   └── tokens/              # InjectionToken definitions
│   ├── features/                # One folder per feature module (Phase 4+)
│   │   ├── search/              # Search view placeholder (Phase 1 scaffold)
│   │   └── itinerary/           # Itinerary view placeholder (Phase 1 scaffold)
│   ├── app.component.ts         # Root component (router outlet only)
│   ├── app.component.html
│   ├── app.component.scss
│   ├── app.config.ts            # ApplicationConfig with providers
│   └── app.routes.ts            # Root route table
├── environments/
│   ├── environment.ts           # Production (default)
│   └── environment.development.ts  # Development overrides
└── styles.scss                  # Global styles, mat.theme() mixin
```

### Pattern 1: Standalone App Bootstrap
**What:** `bootstrapApplication()` replaces `platformBrowserDynamic().bootstrapModule()`. All providers are declared in `app.config.ts`.
**When to use:** Every new Angular 17+ project — this is the canonical entry point.
**Example:**
```typescript
// Source: angular.dev/guide/routing/common-router-tasks
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));

// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),  // Preferred over provideAnimations() — async loads animation engine
  ]
};
```

**Note:** `provideAnimations()` is deprecated as of Angular v20.2; use `provideAnimationsAsync()` from `@angular/platform-browser/animations/async` instead.

### Pattern 2: Lazy Route Loading with loadComponent
**What:** Each feature view is loaded only when the user navigates to it, reducing the initial bundle.
**When to use:** All routes that are not immediately needed on first render.
**Example:**
```typescript
// Source: angular.dev/reference/migrations/route-lazy-loading
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'search',
    pathMatch: 'full',
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then(m => m.SearchComponent),
  },
  {
    path: 'itinerary',
    loadComponent: () =>
      import('./features/itinerary/itinerary.component').then(m => m.ItineraryComponent),
  },
  {
    path: '**',
    redirectTo: 'search',
  },
];
```

### Pattern 3: Angular Material 3 Theme via mat.theme()
**What:** The `mat.theme()` SCSS mixin generates all `--mat-sys-*` CSS custom properties for colors, typography, and density. This is the M3 design token foundation.
**When to use:** Once, at the root `styles.scss` level. Never per-component.
**Example:**
```scss
// Source: angular.love/angular-material-theming-application-with-material-3/
// styles.scss
@use '@angular/material' as mat;

html {
  @include mat.theme((
    color: (
      theme-type: light,
      primary: mat.$azure-palette,
      tertiary: mat.$blue-palette,
    ),
    typography: Roboto,
    density: 0,
  ));
}

// Dark mode variant (class-based, not media-query — easier to toggle programmatically)
html.dark-theme {
  @include mat.theme((
    color: (
      theme-type: dark,
      primary: mat.$azure-palette,
    ),
  ));
}
```

The mixin emits system variables like `--mat-sys-primary`, `--mat-sys-surface`, `--mat-sys-body-large`, `--mat-sys-headline-medium` etc. These are the tokens to reference for custom spacing, typography, and color in app-specific CSS.

### Pattern 4: Angular Signals for Component State
**What:** `signal()`, `computed()`, and `effect()` are the recommended state primitives for local component state and service-level state (Phase 3+).
**When to use:** All new state in Phase 1+ — no `BehaviorSubject` for new code.
**Example:**
```typescript
// Source: angular.dev/guide/signals
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  // ...
})
export class HeaderComponent {
  private readonly _activeTab = signal<'search' | 'itinerary'>('search');
  readonly activeTab = this._activeTab.asReadonly();  // expose read-only to template

  setActiveTab(tab: 'search' | 'itinerary'): void {
    this._activeTab.set(tab);
  }
}
```

### Pattern 5: Environment Configuration with fileReplacements
**What:** Angular CLI's `ng generate environments` creates `src/environments/` with per-config file replacements wired into `angular.json`.
**When to use:** All environment-specific values: API endpoints, API key placeholders, feature flags.
**Example:**
```typescript
// src/environments/environment.ts  (production — base file)
export const environment = {
  production: true,
  apiBaseUrl: '',         // placeholder — injected at deployment
  amadeusApiKey: '',      // placeholder — never set in source code
  googlePlacesApiKey: '', // placeholder
};

// src/environments/environment.development.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4200/api',  // dev proxy target
  amadeusApiKey: '',      // placeholder — set in .env, never committed
  googlePlacesApiKey: '',
};
```

### Anti-Patterns to Avoid
- **Putting standalone components in NgModule declarations:** Results in `'Component is standalone, and cannot be declared in an NgModule'`. All components in this project are standalone — never use NgModule declarations.
- **Using `provideAnimations()` (deprecated v20.2):** Use `provideAnimationsAsync()` instead. The schematic from `ng add @angular/material` may still write the older form — verify and correct.
- **Using barrel files (index.ts) across lazy-loaded feature folders:** Barrel file imports can break lazy loading by causing bundlers to eagerly load all exports. Use direct imports for lazy-loaded features. Barrel files are acceptable within a feature for its own public API, not across feature boundaries.
- **Importing Material modules in every component:** Instead, create a `material.exports.ts` in `core/` that re-exports commonly used Material components (`MatButtonModule`, `MatCardModule`, etc.) as a shared import list. Import the re-export file in feature components.
- **Using `@import` for SCSS:** Angular Material requires `@use` syntax. `@import` is deprecated in Sass and breaks the Material theming API.
- **Hardcoding API keys in environment files committed to git:** The environment files must only contain placeholder empty strings. Keys are injected via CI/CD or proxy layer (Phase 2).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theming and design tokens | Custom CSS variable system | `mat.theme()` mixin + `--mat-sys-*` variables | Material 3 generates 141 system tokens covering color, typography, elevation, shape; hand-rolled system diverges from component internals |
| Navigation tabs/links | Custom active-link detection | `routerLinkActive` directive from `@angular/router` | Handles activation state, exact matching, and ARIA attributes automatically |
| Responsive layout | Custom CSS grid breakpoints | Angular CDK Layout `BreakpointObserver` | Consistent breakpoints tied to Material's spec; observable-based |
| Icon set | Custom SVG sprite | Angular Material Icons (`mat-icon` + Google Fonts Material Icons) | Auto-accessible, ligature-based, zero build step |
| Animation providers | Custom animation setup | `provideAnimationsAsync()` | Required for Material component animations; hand-rolling causes Material components to render without motion |

**Key insight:** Material 3's token system and Angular's routing directives cover every foundation need. Building custom alternatives creates divergence from Material component internals that becomes a maintenance burden.

---

## Common Pitfalls

### Pitfall 1: ng add Writes Deprecated provideAnimations()
**What goes wrong:** `ng add @angular/material` may scaffold `provideAnimations()` in `app.config.ts`. This is deprecated since v20.2 with removal planned for v23.
**Why it happens:** Schematic templates lag behind API deprecation cycles.
**How to avoid:** After running `ng add`, check `app.config.ts` and replace `provideAnimations()` with `provideAnimationsAsync()` from `@angular/platform-browser/animations/async`.
**Warning signs:** Compiler warning mentioning `provideAnimations` deprecation; import from `@angular/platform-browser/animations` (without `/async`).

### Pitfall 2: @import Instead of @use in SCSS
**What goes wrong:** `@import '@angular/material'` fails or produces incorrect output with modern Angular Material.
**Why it happens:** Sass deprecated `@import` in favor of `@use`/`@forward`. Angular Material's SCSS API requires `@use`.
**How to avoid:** Always use `@use '@angular/material' as mat;` and call `mat.theme()`, never `@import`.
**Warning signs:** Sass deprecation warnings during `ng build`; missing `--mat-sys-*` CSS variables in the browser.

### Pitfall 3: Lazy Loading Broken by Cross-Feature Barrel Imports
**What goes wrong:** Adding an `index.ts` that re-exports from multiple feature components causes Angular's bundler to eagerly load all features, defeating `loadComponent` lazy loading.
**Why it happens:** TypeScript's module resolution follows the barrel through to all transitive imports.
**How to avoid:** Only use barrel files within a single feature's own directory. Cross-feature imports must use direct paths: `import { X } from '../features/search/search.component'`.
**Warning signs:** Initial bundle size is suspiciously large; DevTools network tab shows all feature chunks loading on first paint.

### Pitfall 4: Environment File Committed with Real API Keys
**What goes wrong:** API keys appear in git history and are exposed publicly.
**Why it happens:** Developer puts a real key in `environment.development.ts` to test locally.
**How to avoid:** `.gitignore` must NOT exclude environment files (they need to be committed for fileReplacements to work), so environment files must only contain empty strings for key placeholders. Real keys go in a local `.env` that IS gitignored and are injected during build/serve via CI environment variables or a local proxy config.
**Warning signs:** Any non-empty string in an `apiKey` or `apiToken` field inside any `environment.*.ts` file.

### Pitfall 5: router-outlet Missing from Shell Component
**What goes wrong:** Navigating to `/search` or `/itinerary` renders nothing.
**Why it happens:** The shell/app component template needs `<router-outlet>` for the router to mount lazy-loaded components.
**How to avoid:** `app.component.html` must contain `<router-outlet>`. Import `RouterOutlet` in `app.component.ts` imports array (standalone component requires explicit import).
**Warning signs:** No visible content when navigating to a route; no errors but blank page.

### Pitfall 6: Styles Not Applied Because mat.theme() Is Scoped Incorrectly
**What goes wrong:** Material component tokens render with wrong colors or no theme.
**Why it happens:** `mat.theme()` mixin is called inside a component-scoped SCSS file instead of the global `styles.scss` on the `html` or `body` selector.
**How to avoid:** Call `mat.theme()` exactly once, in `styles.scss`, targeting the `html` selector. Never call it in component SCSS files.
**Warning signs:** `--mat-sys-primary` and other CSS variables are absent in browser DevTools on `:root` or `html`.

---

## Code Examples

Verified patterns from official sources:

### Complete app.config.ts (Standalone Bootstrap)
```typescript
// Source: angular.dev/guide/routing/common-router-tasks
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
  ],
};
```

### Complete styles.scss Material 3 Setup
```scss
// Source: angular.love/angular-material-theming-application-with-material-3/
@use '@angular/material' as mat;

// Apply M3 theme — generates all --mat-sys-* design tokens on html element
html {
  @include mat.theme((
    color: (
      theme-type: light,
      primary: mat.$azure-palette,
    ),
    typography: Roboto,
    density: 0,
  ));
}

// Custom spacing tokens (supplement --mat-sys-* with project-specific values)
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 48px;
}

// Apply Material typography to body
body {
  font: var(--mat-sys-body-large);
  margin: 0;
  padding: 0;
}
```

### Lazy Route Table (app.routes.ts)
```typescript
// Source: angular.dev/reference/migrations/route-lazy-loading
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then(m => m.SearchComponent),
  },
  {
    path: 'itinerary',
    loadComponent: () =>
      import('./features/itinerary/itinerary.component').then(m => m.ItineraryComponent),
  },
  { path: '**', redirectTo: 'search' },
];
```

### Environment File Structure
```typescript
// Source: angular.dev/tools/cli/environments
// src/environments/environment.ts  (production)
export const environment = {
  production: true,
  apiBaseUrl: '',
  amadeusApiKey: '',
  googlePlacesApiKey: '',
  viatorApiKey: '',
  openTripMapApiKey: '',
};

// src/environments/environment.development.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4200',
  amadeusApiKey: '',
  googlePlacesApiKey: '',
  viatorApiKey: '',
  openTripMapApiKey: '',
};
```

```json
// angular.json: fileReplacements for development configuration
{
  "configurations": {
    "development": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.development.ts"
        }
      ]
    }
  }
}
```

### Minimal Standalone Shell Component with RouterOutlet
```typescript
// app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
```

```html
<!-- app.component.html -->
<mat-toolbar color="primary">
  <span>Triply</span>
  <nav>
    <a mat-button routerLink="/search" routerLinkActive="active">Search</a>
    <a mat-button routerLink="/itinerary" routerLinkActive="active">Itinerary</a>
  </nav>
</mat-toolbar>

<main>
  <router-outlet></router-outlet>
</main>
```

### Signal-Based Component State Pattern
```typescript
// Source: angular.dev/guide/signals
import { Component, signal, computed } from '@angular/core';

@Component({ standalone: true, /* ... */ })
export class ExampleComponent {
  // Private writable signal
  private readonly _count = signal(0);

  // Public read-only exposure
  readonly count = this._count.asReadonly();

  // Derived value — auto-updates when _count changes
  readonly doubled = computed(() => this._count() * 2);

  increment(): void {
    this._count.update(v => v + 1);
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `standalone: false` by default | `standalone: true` by default | Angular v19 (Nov 2024) | New projects need no NgModule declarations; adding `standalone: false` opts back in |
| `NgModule` bootstrap | `bootstrapApplication()` | Angular v15+ (stable in v17) | All providers use functional API (`provideRouter`, `provideAnimationsAsync`) |
| `BehaviorSubject` for state | `signal()` + `computed()` | Angular v16 (dev preview), v17+ (stable) | Zone.js change detection becoming optional; signals drive fine-grained updates |
| `@import` in SCSS | `@use` / `@forward` | Sass 1.23+; Material enforces `@use` from v15+ | Breaking change for theme setup; must use `@use '@angular/material' as mat` |
| `mat-light-theme()` / `mat-dark-theme()` (M2) | `mat.theme()` mixin (M3) | Angular Material v17+ | M3 generates CSS custom properties (`--mat-sys-*`) instead of Sass variables |
| `provideAnimations()` | `provideAnimationsAsync()` | Angular v20.2 (deprecated); removal planned v23 | Async version defers animation engine load; `ng add` schematic may still emit old form |
| `RouterModule.forRoot()` | `provideRouter()` | Angular v15+ | Tree-shakable; no module wrapping needed |

**Deprecated/outdated:**
- `NgModule`: Still works but not required for new code. Angular team has no removal timeline as of Feb 2026, but all new APIs are module-free.
- `provideAnimations()`: Deprecated v20.2. Use `provideAnimationsAsync()`.
- `@import` in SCSS: Sass deprecated. Angular Material requires `@use`. Will cause compilation warnings/errors.
- `mat-light-theme()` / `mat-palette()` (M2 API): Replaced by `mat.theme()` in M3. M2 API still works but M3 is the default with `ng add @angular/material`.

---

## Open Questions

1. **Angular version to target: 19 vs 20+**
   - What we know: The project says "Angular 17+". Angular 19 is stable (Nov 2024). Angular 20+ is out (2025) and adds further improvements. The `ng new` defaults in 2025/2026 will generate a 20+ project.
   - What's unclear: Whether there is a specific Angular version pinned anywhere in the project or if "latest stable" is acceptable.
   - Recommendation: Use whatever `ng new` produces at time of scaffolding (likely Angular 19-21). The patterns documented here apply to all Angular 17+ versions. Pin the version in `package.json` after scaffolding.

2. **Whether to use zoneless (`--zoneless`) flag**
   - What we know: Signals enable fine-grained reactivity that does not need Zone.js. Angular supports `--zoneless` since v18. However, Angular Material components still have some Zone.js assumptions as of early 2025.
   - What's unclear: Current Material 19-20 compatibility with fully zoneless apps.
   - Recommendation: Do NOT use `--zoneless` in Phase 1. Use the default Zone.js setup. This avoids compatibility risk with Material components. Revisit in a future polish phase if needed.

3. **`ng add @angular/material` schematic output exact form in current CLI**
   - What we know: The schematic installs Material, sets up theming, and modifies `app.config.ts`. Older schematic versions wrote `provideAnimations()` which is now deprecated.
   - What's unclear: Whether the current (2025/2026) schematic already writes `provideAnimationsAsync()`.
   - Recommendation: Run `ng add @angular/material`, then inspect `app.config.ts` and correct `provideAnimations()` → `provideAnimationsAsync()` if needed. Treat this as a verification step in Plan 01-02.

---

## Sources

### Primary (HIGH confidence)
- `angular.dev/guide/signals` — Signal API: `signal()`, `computed()`, `effect()`, `asReadonly()`, `untracked()`
- `angular.dev/tools/cli/environments` — Environment file structure, `ng generate environments`, `fileReplacements` in `angular.json`
- `angular.dev/cli/new` — `ng new` flag reference: `--standalone` (default true), `--routing`, `--style`, `--zoneless`, `--strict`
- `angular.dev/reference/migrations/route-lazy-loading` — `loadComponent` lazy loading syntax
- `angular.dev/api/platform-browser/animations/provideAnimations` — Deprecation notice for `provideAnimations()`; confirmed deprecated v20.2

### Secondary (MEDIUM confidence)
- `angular.love/angular-material-theming-application-with-material-3/` — `mat.theme()` mixin complete syntax, dark mode, typography config, `--mat-sys-*` variable list (verified against angular.dev references)
- `konstantin-denerz.com/angular-material-3-theming-design-tokens-and-system-variables/` — `use-system-variables` flag, 141 system tokens vs 800+ component tokens
- `www.ismaelramos.dev/blog/angular-2025-project-structure-with-the-features-approach/` — Feature-first folder structure, core/ vs shared/, standalone + lazy loading combination
- `iifx.dev/en/articles/456076533/the-angular-19-migration-trap-standalone-vs-ngmodule-errors-explained` — Concrete error messages for standalone/NgModule conflicts in v19

### Tertiary (LOW confidence)
- Multiple WebSearch results confirming `ng add @angular/material` installs CDK, animations, and modifies `styles.scss` — not directly verified against current schematic source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Angular 19+ docs confirmed; Material `ng add` workflow well-documented across multiple sources
- Architecture: HIGH — feature-first structure confirmed by multiple 2025 sources; Angular official docs confirm standalone + `loadComponent` pattern
- Pitfalls: MEDIUM — deprecated API pitfalls confirmed via official docs; barrel file + lazy loading pitfall confirmed by multiple community sources but no single official doc
- Design token system: HIGH — `mat.theme()` SCSS API verified against official source (angular.love article cross-references angular.dev)

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days — Angular ecosystem stable, M3 token API stable since v18)
