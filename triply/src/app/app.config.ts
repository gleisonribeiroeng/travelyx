import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { routes } from './app.routes';
import { authInterceptor } from './core/api/interceptors/auth.interceptor';
import { errorInterceptor } from './core/api/interceptors/error.interceptor';
import { loadingInterceptor } from './core/api/interceptors/loading.interceptor';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,     // 1st: attaches JWT Bearer token
        errorInterceptor,    // 2nd: normalizes errors on the response path
        loadingInterceptor,  // 3rd: wraps full lifecycle with finalize()
      ]),
    ),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ]
};
