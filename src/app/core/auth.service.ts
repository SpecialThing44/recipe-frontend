import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, finalize, tap, switchMap, map } from 'rxjs/operators';

export interface User {
  id?: string;
  name?: string;
  email?: string;
  countryOfOrigin?: string;
  avatarUrl?: string;
  createdOn?: string;
  updatedOn?: string;
}

interface TokenResponse {
  accessToken: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser$ = new BehaviorSubject<User | null>(null);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  
  private accessToken: string | null = null;
  private initialized = false;

  constructor(private http: HttpClient) {
          }

  private readonly API_BASE = 'http://localhost:9000';

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private clearAccessToken(): void {
    this.accessToken = null;
  }

  clearAuthState(): void {
    this.clearAccessToken();
    this.currentUser$.next(null);
  }

  refreshAccessToken(): Observable<string> {
            return this.http.post<TokenResponse>(`${this.API_BASE}/refresh`, {}, { 
      withCredentials: true 
    }).pipe(
      tap(response => {
                        this.setAccessToken(response.accessToken);
        
                const decoded = this.decodeToken(response.accessToken);
        if (decoded && decoded.id && !this.currentUser$.value) {
                              this.http.get<any>(`${this.API_BASE}/user/${decoded.id}`, {
            withCredentials: true,
            headers: { 'Authorization': `Bearer ${response.accessToken}` }
          }).subscribe(response => {
                        const user = response?.Body || response;
            this.currentUser$.next(user);
          });
        }
      }),
      map(response => response.accessToken),
      catchError(err => {
        console.error('Token refresh failed:', err);
        this.clearAuthState();
        return throwError(() => err);
      })
    );
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode token', e);
      return null;
    }
  }

  private handleError(err: HttpErrorResponse) {
    let message = 'Server error';
    try {
      if (err.error) {
        if (typeof err.error === 'string') {
          message = err.error;
        } else if ((err.error as any).message) {
          message = (err.error as any).message;
        } else {
          message = JSON.stringify(err.error);
        }
      } else if (err.statusText) {
        message = err.statusText;
      }
    } catch (e) {
      message = err.message || 'Server error';
    }

    this.error$.next(message);
    return throwError(() => new Error(message));
  }

  loadCurrentUser(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    
            this.refreshAccessToken().subscribe({
      next: () => {
                      },
      error: (err) => {
                        this.clearAuthState();
      }
    });
  }

  signup(input: { name: string; email: string; password: string }): Observable<User> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<TokenResponse>(`${this.API_BASE}/signup`, input, { withCredentials: true }).pipe(
      switchMap(response => {
                this.setAccessToken(response.accessToken);
        
                const decoded = this.decodeToken(response.accessToken);
        if (!decoded || !decoded.id) {
          throw new Error('Invalid token received');
        }

                return this.http.get<any>(`${this.API_BASE}/user/${decoded.id}`, {
          withCredentials: true,
          headers: { 'Authorization': `Bearer ${response.accessToken}` }
        }).pipe(
          map(response => response?.Body || response)
        );
      }),
      tap(user => this.currentUser$.next(user)),
      catchError(err => this.handleError(err)),
      finalize(() => this.loading$.next(false))
    );
  }

  login(input: { email: string; password: string }): Observable<User> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<TokenResponse>(`${this.API_BASE}/login`, input, { withCredentials: true }).pipe(
      switchMap(response => {
                this.setAccessToken(response.accessToken);
        
                const decoded = this.decodeToken(response.accessToken);
        if (!decoded || !decoded.id) {
          throw new Error('Invalid token received');
        }

                return this.http.get<any>(`${this.API_BASE}/user/${decoded.id}`, {
          withCredentials: true,
          headers: { 'Authorization': `Bearer ${response.accessToken}` }
        }).pipe(
          map(response => response?.Body || response)
        );
      }),
      tap(user => this.currentUser$.next(user)),
      catchError(err => this.handleError(err)),
      finalize(() => this.loading$.next(false))
    );
  }

  logout(): Observable<void> {
    this.loading$.next(true);
    this.error$.next(null);
    
    return this.http.post(`${this.API_BASE}/logout`, {}, { 
      withCredentials: true 
    }).pipe(
      map(() => undefined),
      tap(() => {
                        this.clearAccessToken();
        this.currentUser$.next(null);
      }),
      catchError(err => {
                this.clearAccessToken();
        this.currentUser$.next(null);
        return this.handleError(err);
      }),
      finalize(() => this.loading$.next(false))
    );
  }
}