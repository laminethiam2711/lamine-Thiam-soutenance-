import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { demoInterceptors, demoRouterFeatures } from './demo/demo.providers';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), ...demoRouterFeatures),
    provideHttpClient(withInterceptors([authInterceptor, ...demoInterceptors])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
