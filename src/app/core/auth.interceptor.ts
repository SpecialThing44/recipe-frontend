import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { switchMap, take } from 'rxjs/operators';

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
      return next(req);
    })
  );
};
