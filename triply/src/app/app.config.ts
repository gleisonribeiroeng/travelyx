import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { apiKeyInterceptor } from './core/api/interceptors/api-key.interceptor';
import { errorInterceptor } from './core/api/interceptors/error.interceptor';
import { loadingInterceptor } from './core/api/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        apiKeyInterceptor,   // 1st: injects API keys on outgoing requests
        errorInterceptor,    // 2nd: normalizes errors on the response path
        loadingInterceptor,  // 3rd: wraps full lifecycle with finalize()
      ]),
    ),
  ]
};
