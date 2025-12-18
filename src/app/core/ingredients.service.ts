import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from './users.service';

export interface Ingredient {
  id: string;
  name: string;
  aliases: string[];
  wikiLink: string;
  tags: string[];
  createdBy: User;
}

export interface IngredientInput {
  name: string;
  aliases: string[];
  wikiLink: string;
  tags: string[];
}

export interface StringFilter {
  equals?: string;
  anyOf?: string[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}

export interface IngredientsFilters {
  id?: string;
  ids?: string[];
  name?: StringFilter;
  aliasesOrName?: string[];
  tags?: string[];
  orderBy?: {
    name?: boolean;
  };
  limit?: number;
  page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class IngredientsService {
  private readonly API_BASE = (window as any).ENV?.API_BASE_URL || 'http://localhost:9000';

  constructor(private http: HttpClient) {}

  listIngredients(filters?: IngredientsFilters): Observable<Ingredient[]> {
    const body: any = {};

    if (filters) {
      if (filters.id) body.id = filters.id;
      if (filters.ids && filters.ids.length > 0) body.ids = filters.ids;
      if (filters.name) body.name = filters.name;
      if (filters.aliasesOrName && filters.aliasesOrName.length > 0) body.aliasesOrName = filters.aliasesOrName;
      if (filters.tags && filters.tags.length > 0) body.tags = filters.tags;
      if (filters.orderBy) body.orderBy = filters.orderBy;
      if (filters.limit) body.limit = filters.limit;
      if (filters.page !== undefined) body.page = filters.page;
    }

    return this.http.post<any>(`${this.API_BASE}/ingredients/query`, body, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || [])
    );
  }

  getIngredient(id: string): Observable<Ingredient> {
    return this.http.get<any>(`${this.API_BASE}/ingredients/${id}`, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  createIngredient(input: IngredientInput): Observable<Ingredient> {
    return this.http.post<any>(`${this.API_BASE}/ingredients`, input, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  updateIngredient(id: string, input: Partial<IngredientInput>): Observable<Ingredient> {
    return this.http.put<any>(`${this.API_BASE}/ingredients/${id}`, input, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  deleteIngredient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/ingredients/${id}`, {
      withCredentials: true
    });
  }
}
