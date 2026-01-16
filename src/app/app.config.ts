import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';
import { provideAuth, LogLevel } from 'angular-auth-oidc-client';

import { routes } from './app.routes';

export function initializeAuth(authService: AuthService) {
  return () => {
    // Call checkAuth to initialize authentication state on app load
    return (authService as any).checkAuth();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAuth({
      config: {
        authority: (window as any).ENV?.AUTH_AUTHORITY || 'https://auth.spencers.cc/application/o/cooking-app-dev/',
        authWellknownEndpointUrl: (window as any).ENV?.AUTH_WELLKNOWN_ENDPOINT || 'https://auth.spencers.cc/application/o/cooking-app-dev/.well-known/openid-configuration',
        redirectUrl: window.location.origin + '/callback',
        // postLogoutRedirectUri: window.location.origin,
        clientId: (window as any).ENV?.AUTH_CLIENT_ID || 'CrlaWqtWtKXSt8vYM6o9caiVGaLx2FxegYbOohOe',
        scope: 'openid profile email offline_access',
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,
        renewTimeBeforeTokenExpiresInSeconds: 30,
        ignoreNonceAfterRefresh: true,
        triggerRefreshWhenIdTokenExpired: false,
        allowUnsafeReuseRefreshToken: false,
        autoUserInfo: false,
        logLevel: LogLevel.Debug,
      },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    }
  ]
};