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
    this.checkAuth();
  }

  private checkAuth() {
    this.oidcSecurityService.checkAuth().subscribe({
      next: (loginResponse: LoginResponse) => {
        const { isAuthenticated } = loginResponse;
        if (isAuthenticated) {
          this.fetchCurrentUser();
          // If we are on the callback route, navigate to home/recipes
          if (window.location.pathname.includes('callback')) {
            this.router.navigate(['/recipes']);
          }
        } else {
          this.currentUser$.next(null);
          // If we are on callback but not authenticated, redirect to home
          if (window.location.pathname.includes('callback')) {
            this.router.navigate(['/']);
          }
        }
      },
      error: (err) => {
        console.error('OIDC checkAuth failed', err);
        this.currentUser$.next(null);
        if (window.location.pathname.includes('callback')) {
          this.router.navigate(['/']);
        }
      }
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
