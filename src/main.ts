import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER, EnvironmentProviders, Provider } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

function authConfig() {
  return {
    authority:
      (window as any).ENV?.AUTH_AUTHORITY ||
      'https://auth.spencers.cc/application/o/cooking-app-dev/',
    authWellknownEndpointUrl:
      (window as any).ENV?.AUTH_WELLKNOWN_ENDPOINT ||
      'https://auth.spencers.cc/application/o/cooking-app-dev/.well-known/openid-configuration',
    redirectUrl: window.location.origin + '/callback',
    clientId:
      (window as any).ENV?.AUTH_CLIENT_ID ||
      'CrlaWqtWtKXSt8vYM6o9caiVGaLx2FxegYbOohOe',
    scope: 'openid profile email offline_access',
    responseType: 'code',
    silentRenew: true,
    useRefreshToken: true,
    renewTimeBeforeTokenExpiresInSeconds: 30,
    ignoreNonceAfterRefresh: true,
    triggerRefreshWhenIdTokenExpired: false,
    allowUnsafeReuseRefreshToken: false,
    autoUserInfo: false
  };
}

async function getAuthProviders(): Promise<Array<Provider | EnvironmentProviders>> {
  const [{ provideAuth, LogLevel }, { AuthService }] = await Promise.all([
    import('angular-auth-oidc-client'),
    import('./app/core/auth.service')
  ]);

  const initializeAuth = (authService: any) => {
    return () => (authService as any).checkAuth();
  };

  return [
    provideAuth({
      config: {
        ...authConfig(),
        logLevel: LogLevel.Debug
      }
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    }
  ];
}

async function bootstrap() {
  const authProviders = await getAuthProviders();
  await bootstrapApplication(App, {
    ...appConfig,
    providers: [...(appConfig.providers ?? []), ...authProviders]
  });
}

bootstrap().catch((err) => console.error(err));
