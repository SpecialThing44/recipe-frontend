import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, map, retry } from 'rxjs/operators';
import { OidcSecurityService, LoginResponse } from 'angular-auth-oidc-client';

export interface AvatarUrls {
  thumbnail: string;
  medium: string;
  large: string;
}

export interface User {
  id?: string;
  name?: string;
  email?: string;
  admin?: boolean;
  countryOfOrigin?: string;
  avatar?: AvatarUrls;
  createdOn?: string;
  updatedOn?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser$ = new BehaviorSubject<User | null>(null);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  
  private readonly API_BASE = 'http://localhost:9000';
  private oidcSecurityService = inject(OidcSecurityService);
  private router = inject(Router);

  constructor(private http: HttpClient) {
    // Don't call checkAuth in constructor - let it be called by APP_INITIALIZER
    this.monitorTokenExpiration();
  }

  private checkAuth() {
    return new Promise<void>((resolve) => {
      this.oidcSecurityService.checkAuth().subscribe({
        next: (loginResponse: LoginResponse) => {
          const { isAuthenticated } = loginResponse;
          if (isAuthenticated) {
            this.fetchCurrentUser();
            // If we are on the callback route, navigate to return URL or recipes
            if (window.location.pathname.includes('callback')) {
              const returnUrl = sessionStorage.getItem('returnUrl');
              sessionStorage.removeItem('returnUrl');
              this.router.navigate([returnUrl || '/recipes']);
            }
          } else {
            this.currentUser$.next(null);
            // If we are on callback but not authenticated, redirect to home
            if (window.location.pathname.includes('callback')) {
              this.router.navigate(['/']);
            }
          }
          resolve();
        },
        error: (err) => {
          console.error('OIDC checkAuth failed', err);
          this.currentUser$.next(null);
          if (window.location.pathname.includes('callback')) {
            this.router.navigate(['/']);
          }
          resolve();
        }
      });
    });
  }

  getAccessToken(): Observable<string> {
    return this.oidcSecurityService.getAccessToken();
  }

  login(): void {
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    this.oidcSecurityService.logoff().subscribe(() => {
        this.currentUser$.next(null);
    });
  }

  loadCurrentUser(): void {
      // This method is kept for compatibility if needed, but checkAuth handles it.
  }

  private monitorTokenExpiration(): void {
    // Monitor authentication state and token refresh events
    this.oidcSecurityService.checkSessionChanged$.subscribe(() => {
      console.log('Session changed, re-checking authentication...');
      this.oidcSecurityService.isAuthenticated$.subscribe(({ isAuthenticated }) => {
        if (isAuthenticated) {
          // Session refreshed successfully, update user if needed
          if (!this.currentUser$.value) {
            this.fetchCurrentUser();
          }
        } else {
          // Session lost - clear user state
          console.log('Session lost - user needs to re-authenticate');
          this.currentUser$.next(null);
        }
      });
    });
  }

  private fetchCurrentUser(): void {
    this.loading$.next(true);
    // The backend now identifies the user by the token.
    // We assume GET /user returns the user profile.
    this.http.get<any>(`${this.API_BASE}/user`).pipe(
      retry({ count: 3, delay: 500 }),
      map(response => response?.Body || response),
      tap(user => this.currentUser$.next(user)),
      catchError(err => {
        console.error('Failed to fetch user profile', err);
        this.error$.next('Failed to fetch user profile');
        return of(null);
      }),
      tap(() => this.loading$.next(false))
    ).subscribe();
  }
}
