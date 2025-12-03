import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AvatarUrls {
  thumbnail: string;
  medium: string;
  large: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  admin: boolean;
  countryOfOrigin?: string;
  avatar?: AvatarUrls;
  createdOn: string;
  updatedOn: string;
}

export interface StringFilter {
  equals?: string;
  anyOf?: string[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}

export interface UsersFilters {
  id?: string;
  ids?: string[];
  name?: StringFilter;
  email?: StringFilter;
  orderBy?: {
    name?: boolean;
  };
  limit?: number;
  page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly API_BASE = 'http://localhost:9000';

  constructor(private http: HttpClient) {}

  listUsers(filters?: UsersFilters): Observable<User[]> {
    const body: any = {};

    if (filters) {
      if (filters.id) {
        body.id = filters.id;
      }
      if (filters.ids && filters.ids.length > 0) {
        body.ids = filters.ids;
      }

      if (filters.name) {
        body.name = filters.name;
      }

      if (filters.email) {
        body.email = filters.email;
      }

      if (filters.orderBy) {
        body.orderBy = filters.orderBy;
      }

      if (filters.limit) {
        body.limit = filters.limit;
      }
      if (filters.page !== undefined) {
        body.page = filters.page;
      }
    }

    return this.http.post<any>(`${this.API_BASE}/user/query`, body, { 
      withCredentials: true
    }).pipe(
      map((response: any) => {
        return response?.Body || [];
      })
    );
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_BASE}/user/${id}`, { 
      withCredentials: true 
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return this.http.put<any>(`${this.API_BASE}/user/${id}`, updates, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  uploadAvatar(id: string, imageFile: File): Observable<User> {
    return this.http.put<any>(`${this.API_BASE}/user/${id}/avatar`, imageFile, {
      withCredentials: true,
      headers: {
        'Content-Type': imageFile.type
      }
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/user/${id}`, { 
      withCredentials: true 
    });
  }
}
