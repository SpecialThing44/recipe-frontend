import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { throwError } from 'rxjs';
import { switchMap, take, catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oidcSecurityService = inject(OidcSecurityService);
  const router = inject(Router);
  
  return oidcSecurityService.getAccessToken().pipe(
    take(1),
    switchMap(accessToken => {
      if (accessToken) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`
          }
        });
      }
      return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 403) {
            // Token expired or invalid - trigger re-authentication
            console.warn('Authentication error, redirecting to login...');
            // Store current URL to return after login
            const currentUrl = router.url;
            if (!currentUrl.includes('callback')) {
              sessionStorage.setItem('returnUrl', currentUrl);
            }
            // Trigger OIDC login flow
            oidcSecurityService.authorize();
          }
          return throwError(() => error);
        })
      );
    })
  );
};
