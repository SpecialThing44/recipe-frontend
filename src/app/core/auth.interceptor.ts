import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { throwError } from 'rxjs';
import { switchMap, take, catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oidcSecurityService = inject(OidcSecurityService);

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
          if (error.status === 401 && accessToken) {
            return oidcSecurityService.forceRefreshSession().pipe(
              take(1),
              switchMap(loginResponse => {
                if (!loginResponse.isAuthenticated || !loginResponse.accessToken) {
                  return throwError(() => error);
                }

                return next(
                  req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${loginResponse.accessToken}`
                    }
                  })
                );
              }),
              catchError(() => throwError(() => error))
            );
          }

          return throwError(() => error);
        })
      );
    })
  );
};
