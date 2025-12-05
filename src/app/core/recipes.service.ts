import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from './users.service';

export interface ImageUrls {
  thumbnail: string;
  medium: string;
  large: string;
}

export interface Ingredient {
  id: string;
  name: string;
  aliases: string[];
  wikiLink: string;
  tags: string[];
  createdBy: User;
}

export interface Quantity {
  unit: string;
  amount: number;
}

export interface InstructionIngredient {
  ingredient: Ingredient;
  quantity: Quantity;
  description?: string;
}

export interface Recipe {
  id: string;
  name: string;
  createdBy: User;
  tags: string[];
  ingredients: InstructionIngredient[];
  prepTime: number;
  cookTime: number;
  countryOfOrigin?: string;
  public: boolean;
  wikiLink?: string;
  instructions: any; // Quill Delta object from backend
  instructionImages: string[];
  image?: ImageUrls;
  createdOn: string;
  updatedOn: string;
}

export interface RecipeIngredientInput {
  ingredientId: string;
  quantity: Quantity;
  description?: string;
}

export interface RecipeInput {
  name: string;
  tags: string[];
  ingredients: RecipeIngredientInput[];
  prepTime: number;
  cookTime: number;
  countryOfOrigin?: string;
  public: boolean;
  wikiLink?: string;
  instructions: string; // Quill Delta JSON string
}

export interface StringFilter {
  equals?: string;
  anyOf?: string[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}

export interface NumberFilter {
  greaterOrEqual?: number;
  lessOrEqual?: number;
}

export interface RecipesFilters {
  id?: string;
  ids?: string[];
  belongsToUser?: string;
  savedByUser?: string;
  name?: StringFilter;
  prepTime?: NumberFilter;
  cookTime?: NumberFilter;
  public?: boolean;
  tags?: string[];
  ingredients?: string[];
  notIngredients?: string[];
  orderBy?: {
    name?: boolean;
  };
  limit?: number;
  page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipesService {
  private readonly API_BASE = 'http://localhost:9000';

  constructor(private http: HttpClient) {}

  listRecipes(filters?: RecipesFilters): Observable<Recipe[]> {
    const body: any = {};

    if (filters) {
      if (filters.id) body.id = filters.id;
      if (filters.ids && filters.ids.length > 0) body.ids = filters.ids;
      if (filters.belongsToUser) body.belongsToUser = filters.belongsToUser;
      if (filters.savedByUser) body.savedByUser = filters.savedByUser;
      if (filters.name) body.name = filters.name;
      if (filters.prepTime) body.prepTime = filters.prepTime;
      if (filters.cookTime) body.cookTime = filters.cookTime;
      if (filters.public !== undefined) body.public = filters.public;
      if (filters.tags && filters.tags.length > 0) body.tags = filters.tags;
      if (filters.ingredients && filters.ingredients.length > 0) body.ingredients = filters.ingredients;
      if (filters.notIngredients && filters.notIngredients.length > 0) body.notIngredients = filters.notIngredients;
      if (filters.orderBy) body.orderBy = filters.orderBy;
      if (filters.limit) body.limit = filters.limit;
      if (filters.page !== undefined) body.page = filters.page;
    }

    return this.http.post<any>(`${this.API_BASE}/recipes/query`, body, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || [])
    );
  }

  getRecipe(id: string): Observable<Recipe> {
    return this.http.get<any>(`${this.API_BASE}/recipes/${id}`, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  createRecipe(input: RecipeInput): Observable<Recipe> {
    return this.http.post<any>(`${this.API_BASE}/recipes`, input, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  uploadRecipeImage(id: string, imageFile: File): Observable<Recipe> {
    return this.http.put<any>(`${this.API_BASE}/recipes/${id}/image`, imageFile, {
      withCredentials: true,
      headers: {
        'Content-Type': imageFile.type
      }
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  uploadInstructionImage(id: string, imageFile: File): Observable<{ url: string }> {
    return this.http.post<any>(`${this.API_BASE}/recipes/${id}/instruction-image`, imageFile, {
      withCredentials: true,
      headers: {
        'Content-Type': imageFile.type
      }
    });
  }

  updateRecipe(id: string, input: Partial<RecipeInput>): Observable<Recipe> {
    return this.http.put<any>(`${this.API_BASE}/recipes/${id}`, input, {
      withCredentials: true
    }).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  saveRecipe(id: string): Observable<void> {
    return this.http.post<void>(`${this.API_BASE}/recipes/${id}/save`, {}, {
      withCredentials: true
    });
  }

  unsaveRecipe(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/recipes/${id}/save`, {
      withCredentials: true
    });
  }

  deleteRecipe(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/recipes/${id}`, {
      withCredentials: true
    });
  }
}

