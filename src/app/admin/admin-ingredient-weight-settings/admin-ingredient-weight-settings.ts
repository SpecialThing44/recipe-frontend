import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService, User } from '../../core/auth.service';
import { AdminService } from '../../core/admin.service';

@Component({
  selector: 'app-admin-ingredient-weight-settings',
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
  templateUrl: './admin-ingredient-weight-settings.html',
  styleUrl: './admin-ingredient-weight-settings.scss'
})
export class AdminIngredientWeightSettingsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isAdmin = false;

  isLoading = false;
  isSaving = false;

  successMessage: string | null = null;
  errorMessage: string | null = null;

  readonly meanRawPenaltyFactorControl = new FormControl<number | null>(null, {
    validators: [Validators.required]
  });

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
        return;
      }

      if (this.isAdmin) {
        this.loadSettings();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  login(): void {
    this.authService.login();
  }

  backToJobs(): void {
    this.router.navigate(['/admin/ingredient-weights']);
  }

  loadSettings(): void {
    if (!this.isAdmin || this.isLoading) {
      return;
    }

    this.clearMessages();
    this.isLoading = true;

    this.adminService.ingredientWeightSettings().pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: response => {
        this.meanRawPenaltyFactorControl.setValue(response.meanRawPenaltyFactor);
        this.successMessage = 'Loaded current k constant';
      },
      error: err => {
        this.errorMessage = this.extractError(err, 'Failed to load settings');
      }
    });
  }

  saveSettings(): void {
    if (!this.isAdmin || this.isSaving) {
      return;
    }

    const k = this.meanRawPenaltyFactorControl.value;
    if (k === null || Number.isNaN(k)) {
      this.errorMessage = 'Enter a valid value for k';
      this.successMessage = null;
      return;
    }

    this.clearMessages();
    this.isSaving = true;

    this.adminService.updateIngredientWeightSettings(k).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: response => {
        this.meanRawPenaltyFactorControl.setValue(response.meanRawPenaltyFactor);
        this.successMessage = `Saved k constant: ${response.meanRawPenaltyFactor}`;
      },
      error: err => {
        this.errorMessage = this.extractError(err, 'Failed to save settings');
      }
    });
  }

  private clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
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
}
