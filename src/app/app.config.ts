import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
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
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAuth({
      config: {
        authority: 'https://auth.spencers.cc/application/o/cooking-app-dev/', // Trailing slash to match Authentik Issuer
        authWellknownEndpointUrl: 'https://auth.spencers.cc/application/o/cooking-app-dev/.well-known/openid-configuration', // Explicit URL to avoid double slash
        redirectUrl: window.location.origin + '/callback',
        postLogoutRedirectUri: window.location.origin,
        clientId: 'CrlaWqtWtKXSt8vYM6o9caiVGaLx2FxegYbOohOe', // TODO: Replace with your Client ID
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