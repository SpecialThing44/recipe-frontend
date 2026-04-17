import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface IngredientWeightQueueResponse {
  status: string;
  jobId: string;
}

export interface IngredientWeightJobStatus {
  jobId: string;
  status: string;
  processedEvents: number;
  statsJson?: string | null;
  error?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface IngredientWeightActiveJobsResponse {
  jobIds: string[];
}

export interface IngredientWeightSettingsResponse {
  meanRawPenaltyFactor: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly API_BASE = (window as any).ENV?.API_BASE_URL || 'http://localhost:9000';

  constructor(private http: HttpClient) {}

  processIngredientWeightEvents(): Observable<IngredientWeightQueueResponse> {
    return this.http.post<IngredientWeightQueueResponse>(
      `${this.API_BASE}/admin/ingredient-weights/process-events`,
      {},
      { withCredentials: true }
    ).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  rebuildIngredientWeights(): Observable<IngredientWeightQueueResponse> {
    return this.http.post<IngredientWeightQueueResponse>(
      `${this.API_BASE}/admin/ingredient-weights/rebuild`,
      {},
      { withCredentials: true }
    ).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  ingredientWeightJobStatus(jobId: string): Observable<IngredientWeightJobStatus> {
    return this.http.get<IngredientWeightJobStatus>(
      `${this.API_BASE}/admin/ingredient-weights/jobs/${jobId}`,
      { withCredentials: true }
    ).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  activeIngredientWeightJobIds(): Observable<IngredientWeightActiveJobsResponse> {
    return this.http.get<IngredientWeightActiveJobsResponse>(
      `${this.API_BASE}/admin/ingredient-weights/jobs/active`,
      { withCredentials: true }
    ).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  ingredientWeightSettings(): Observable<IngredientWeightSettingsResponse> {
    return this.http.get<IngredientWeightSettingsResponse>(
      `${this.API_BASE}/admin/ingredient-weights/settings`,
      { withCredentials: true }
    ).pipe(
      map((response: any) => response?.Body || response)
    );
  }

  updateIngredientWeightSettings(meanRawPenaltyFactor: number): Observable<IngredientWeightSettingsResponse> {
    return this.http.put<IngredientWeightSettingsResponse>(
      `${this.API_BASE}/admin/ingredient-weights/settings`,
      { meanRawPenaltyFactor },
      { withCredentials: true }
    ).pipe(
      map((response: any) => response?.Body || response)
    );
  }
}
