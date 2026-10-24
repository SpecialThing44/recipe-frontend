import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Tag {
  tag: string;
}

export interface TagsFilters {
  name?: {
    contains?: string;
    startsWith?: string;
    endsWith?: string;
    equals?: string;
  };
  limit?: number;
  page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TagsService {
  private readonly API_BASE = window.ENV?.API_BASE_URL || 'http://localhost:9000';

  constructor(private http: HttpClient) {}

  listTags(filters?: TagsFilters): Observable<string[]> {
    const body: TagsFilters = {};

    if (filters) {
      if (filters.name) body.name = filters.name;
      if (filters.limit) body.limit = filters.limit;
      if (filters.page !== undefined) body.page = filters.page;
    }

    return this.http.post<{ Body: Array<Tag | string> }>(`${this.API_BASE}/tags/query`, body, {
      withCredentials: true
    }).pipe(
      map(response => {
        const tags = response?.Body || [];
        return tags.map((t: Tag | string) => typeof t === 'string' ? t : t.tag);
      })
    );
  }
}
