import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

export interface User {
  id?: string;
  name?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser$ = new BehaviorSubject<User | null>(null);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    this.loadCurrentUser();
  }

  private readonly API_BASE = 'http://localhost:9000';

  private handleError(err: HttpErrorResponse) {
    // Try to extract a helpful message from the response body
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
    this.http.get<User>(`${this.API_BASE}/user`, { withCredentials: true }).pipe(
      catchError(() => {
        this.currentUser$.next(null);
        return of(null as User | null);
      })
    ).subscribe((u: any) => {
      if (u && Object.keys(u).length) { this.currentUser$.next(u); }
    });
  }

  signup(input: { name: string; email: string; password: string }): Observable<User> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<User>(`${this.API_BASE}/signup`, input, { withCredentials: true }).pipe(
      tap(user => this.currentUser$.next(user)),
      catchError(err => this.handleError(err)),
      finalize(() => this.loading$.next(false))
    );
  }

  login(input: { email: string; password: string }): Observable<User> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<User>(`${this.API_BASE}/login`, input, { withCredentials: true }).pipe(
      tap(user => this.currentUser$.next(user)),
      catchError(err => this.handleError(err)),
      finalize(() => this.loading$.next(false))
    );
  }

  logout(): Observable<void> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<void>(`${this.API_BASE}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.currentUser$.next(null)),
      catchError(err => this.handleError(err)),
      finalize(() => this.loading$.next(false))
    );
  }
}