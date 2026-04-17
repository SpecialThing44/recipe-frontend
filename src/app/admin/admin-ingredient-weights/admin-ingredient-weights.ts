import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService, User } from '../../core/auth.service';
import {
  AdminService,
  IngredientWeightJobStatus,
  IngredientWeightQueueResponse
} from '../../core/admin.service';

@Component({
  selector: 'app-admin-ingredient-weights',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './admin-ingredient-weights.html',
  styleUrl: './admin-ingredient-weights.scss'
})
export class AdminIngredientWeightsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isAdmin = false;

  processLoading = false;
  rebuildLoading = false;
  statusLoading = false;
  activeJobsLoading = false;

  lastQueuedJobId: string | null = null;
  activeJobIds: string[] = [];
  jobStatus: IngredientWeightJobStatus | null = null;
  parsedStatsJson: unknown | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  readonly jobIdControl = new FormControl('', { nonNullable: true });

  private authSub?: Subscription;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.admin === true;

      if (user && !this.isAdmin) {
        this.router.navigate(['/unauthorized']);
      }
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  login(): void {
    this.authService.login();
  }

  goToSettings(): void {
    this.router.navigate(['/admin/ingredient-weights/settings']);
  }

  processEvents(): void {
    if (!this.isAdmin) {
      return;
    }

    this.clearMessages();
    this.processLoading = true;

    this.adminService.processIngredientWeightEvents().pipe(
      finalize(() => {
        this.processLoading = false;
      })
    ).subscribe({
      next: response => this.handleQueuedJob(response, 'Process events job queued'),
      error: err => {
        this.errorMessage = this.extractError(err, 'Failed to queue process events job');
      }
    });
  }

  rebuildWeights(): void {
    if (!this.isAdmin) {
      return;
    }

    this.clearMessages();
    this.rebuildLoading = true;

    this.adminService.rebuildIngredientWeights().pipe(
      finalize(() => {
        this.rebuildLoading = false;
      })
    ).subscribe({
      next: response => this.handleQueuedJob(response, 'Rebuild job queued'),
      error: err => {
        this.errorMessage = this.extractError(err, 'Failed to queue rebuild job');
      }
    });
  }

  loadJobStatus(): void {
    if (!this.isAdmin) {
      return;
    }

    const jobId = this.jobIdControl.value.trim();
    if (!jobId) {
      this.errorMessage = 'Enter a job ID first';
      this.successMessage = null;
      return;
    }

    this.clearMessages();
    this.statusLoading = true;

    this.adminService.ingredientWeightJobStatus(jobId).pipe(
      finalize(() => {
        this.statusLoading = false;
      })
    ).subscribe({
      next: status => {
        this.jobStatus = status;
        this.parsedStatsJson = this.parseStatsJson(status.statsJson);
        this.successMessage = `Loaded status for ${status.jobId}`;
      },
      error: err => {
        this.jobStatus = null;
        this.parsedStatsJson = null;
        this.errorMessage = this.extractError(err, 'Failed to load job status');
      }
    });
  }

  useLastJobId(): void {
    if (!this.lastQueuedJobId) {
      return;
    }

    this.jobIdControl.setValue(this.lastQueuedJobId);
    this.loadJobStatus();
  }

  loadActiveJobs(): void {
    if (!this.isAdmin) {
      return;
    }

    this.clearMessages();
    this.activeJobsLoading = true;

    this.adminService.activeIngredientWeightJobIds().pipe(
      finalize(() => {
        this.activeJobsLoading = false;
      })
    ).subscribe({
      next: response => {
        this.activeJobIds = response.jobIds;
        this.successMessage = `Loaded ${response.jobIds.length} active job${response.jobIds.length === 1 ? '' : 's'}`;
      },
      error: err => {
        this.activeJobIds = [];
        this.errorMessage = this.extractError(err, 'Failed to load active jobs');
      }
    });
  }

  private handleQueuedJob(response: IngredientWeightQueueResponse, successPrefix: string): void {
    this.lastQueuedJobId = response.jobId;
    this.jobIdControl.setValue(response.jobId);
    this.successMessage = `${successPrefix}: ${response.jobId}`;
  }

  private clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  private extractError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const responseError = error.error?.error;
      if (typeof responseError === 'string' && responseError.trim().length > 0) {
        return responseError;
      }
    }

    return fallback;
  }

  private parseStatsJson(statsJson?: string | null): unknown | null {
    if (!statsJson) {
      return null;
    }

    try {
      return JSON.parse(statsJson);
    } catch {
      return statsJson;
    }
  }
}
