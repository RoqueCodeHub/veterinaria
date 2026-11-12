import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { PRIMENG_ES } from './core/i18n/primeng-es';
import { AlivetPreset } from './core/theme/alivet-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => {
      inject(ViewportScroller).setOffset([0, 96]);
    }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    MessageService,
    providePrimeNG({
      translation: PRIMENG_ES,
      theme: {
        preset: AlivetPreset,
        options: {
          darkModeSelector: 'none',
        },
      },
    }),
  ],
};
