import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card';
import { AuthService, User } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { RecipesService, Recipe } from '../../core/recipes.service';
import { CountriesService, Country } from '../../core/countries.service';
import { combineLatest, Subject, Observable, Subscription, of } from 'rxjs';
import { takeUntil, startWith, map, switchMap, catchError, finalize, distinctUntilChanged, tap } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatDialogModule,
    RecipeCardComponent
  ],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss'
})
export class UserProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  currentUser: User | null = null;
  readonly profileForm;
  loading = false;
  saving = false;
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  filteredCountries$!: Observable<Country[]>;
  private destroy$ = new Subject<void>();
  private userRecipeRequest?: Subscription;
  private savedRecipeRequest?: Subscription;
  private savedStatusRequest?: Subscription;
  
  userRecipes: Recipe[] = [];
  savedRecipes: Recipe[] = [];
  loadingRecipes = false;
  savedRecipeIds = new Set<string>();
  savingRecipeIds = new Set<string>();

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private recipesService: RecipesService,
    private countriesService: CountriesService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.profileForm = this.fb.nonNullable.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      countryOfOrigin: ['']
    });
    
    // Setup country autocomplete filtering
    this.filteredCountries$ = this.profileForm.get('countryOfOrigin')!.valueChanges.pipe(
      startWith(''),
      map(value => this.countriesService.filterCountries(value || ''))
    );
  }

  ngOnInit(): void {
    combineLatest([this.authService.currentUser$, this.route.params]).pipe(
      tap(([currentUser]) => this.currentUser = currentUser),
      distinctUntilChanged(([previousUser, previousParams], [currentUser, params]) =>
        previousUser?.id === currentUser?.id && previousParams['id'] === params['id']),
      switchMap(([currentUser, params]) => {
        this.currentUser = currentUser;
        this.userRecipeRequest?.unsubscribe();
        this.savedRecipeRequest?.unsubscribe();
        this.savedStatusRequest?.unsubscribe();
        this.user = null;
        this.userRecipes = [];
        this.savedRecipes = [];
        this.savedRecipeIds.clear();
        this.avatarPreview = null;
        this.avatarFile = null;
        this.loading = true;
        return this.usersService.getUser(params['id']).pipe(
          catchError(error => {
            console.error('Error loading user:', error);
            this.snackBar.open('Failed to load user profile', 'Close', { duration: 3000 });
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.loading = false;
      if (!user) return;
      this.user = user;
      this.profileForm.patchValue({
        name: user.name, email: user.email, countryOfOrigin: user.countryOfOrigin || ''
      }, { emitEvent: false });
      if (this.isOwnProfile()) this.profileForm.enable({ emitEvent: false });
      else this.profileForm.disable({ emitEvent: false });
      this.avatarPreview = user.avatar?.large || null;
      this.loadUserRecipes(user.id);
      if (this.isOwnProfile()) this.loadSavedRecipes();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isOwnProfile(): boolean {
    return this.currentUser?.id === this.user?.id;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('Image must be less than 5MB', 'Close', { duration: 3000 });
        return;
      }

      this.avatarFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    if (!this.user?.id || this.profileForm.invalid) {
      return;
    }

    this.saving = true;
    const updates: Partial<User> = {};
    
    const formValue = this.profileForm.value;
    if (formValue.name !== this.user.name) {
      updates.name = formValue.name;
    }
    if (formValue.email !== this.user.email) {
      updates.email = formValue.email;
    }
    if (formValue.countryOfOrigin !== this.user.countryOfOrigin) {
      updates.countryOfOrigin = formValue.countryOfOrigin || "";
    }

    // Update profile first if there are changes
    if (Object.keys(updates).length > 0) {
      this.usersService.updateUser(this.user.id, updates).subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          if (this.isOwnProfile()) {
            this.authService.currentUser$.next(updatedUser);
          }
          
          // Upload avatar if one was selected
          if (this.avatarFile) {
            this.uploadAvatar();
          } else {
            this.saving = false;
            this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('Error updating profile:', err);
          this.saving = false;
          this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
        }
      });
    } else if (this.avatarFile) {
      // Only avatar update
      this.uploadAvatar();
    } else {
      this.saving = false;
      this.snackBar.open('No changes to save', 'Close', { duration: 2000 });
    }
  }

  private uploadAvatar(): void {
    if (!this.user?.id || !this.avatarFile) {
      return;
    }

    this.usersService.uploadAvatar(this.user.id, this.avatarFile).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        if (this.isOwnProfile()) {
          this.authService.currentUser$.next(updatedUser);
        }
        this.avatarFile = null;
        this.avatarPreview = updatedUser.avatar?.large || null;
        this.saving = false;
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Error uploading avatar:', err);
        this.saving = false;
        this.snackBar.open('Failed to upload avatar', 'Close', { duration: 3000 });
      }
    });
  }

  getAvatarDisplay(): string {
    if (this.avatarPreview) {
      return this.avatarPreview;
    }
    return '';
  }

  hasAvatarToDisplay(): boolean {
    return !!this.avatarPreview;
  }
  
  loadUserRecipes(userId: string): void {
    this.loadingRecipes = true;
    
    this.userRecipeRequest?.unsubscribe();
    this.userRecipeRequest = this.recipesService.listRecipes({
      belongsToUser: userId,
      limit: 10,
      page: 0
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (recipes: Recipe[]) => {
        this.userRecipes = recipes || [];
        this.loadVisibleSavedStatus();
        this.loadingRecipes = false;
      },
      error: (err: any) => {
        console.error('Error loading user recipes:', err);
        this.loadingRecipes = false;
      }
    });
  }
  
  loadSavedRecipes(): void {
    if (!this.user?.id) return;
    
    this.savedRecipeRequest?.unsubscribe();
    this.savedRecipeRequest = this.recipesService.listRecipes({
      savedByUser: this.user.id,
      limit: 10,
      page: 0
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (recipes: Recipe[]) => {
        this.savedRecipes = recipes || [];
        this.loadVisibleSavedStatus();
      },
      error: (err: any) => {
        console.error('Error loading saved recipes:', err);
      }
    });
  }
  
  private loadVisibleSavedStatus(): void {
    this.savedStatusRequest?.unsubscribe();
    const ids = Array.from(new Set([...this.userRecipes, ...this.savedRecipes].map(recipe => recipe.id)));
    if (!this.currentUser?.id || ids.length === 0) {
      this.savedRecipeIds.clear();
      return;
    }
    this.savedStatusRequest = this.recipesService.listRecipes({
      ids, savedByUser: this.currentUser.id, limit: ids.length
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: recipes => this.savedRecipeIds = new Set(recipes.map(recipe => recipe.id)),
      error: () => this.savedRecipeIds.clear()
    });
  }

  async editRecipe(recipe: Recipe): Promise<void> {
    const { RecipeEditDialogComponent } = await import('../../recipes/recipe-edit-dialog/recipe-edit-dialog');
    const dialogRef = this.dialog.open(RecipeEditDialogComponent, {
      width: '900px', maxWidth: '95vw', data: { recipe }
    });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) this.refreshRecipes();
    });
  }

  deleteRecipe(recipe: Recipe): void {
    if (!confirm(`Are you sure you want to delete "${recipe.name}"?`)) return;
    this.recipesService.deleteRecipe(recipe.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.refreshRecipes(),
      error: () => this.snackBar.open('Failed to delete recipe', 'Close', { duration: 3000 })
    });
  }

  toggleSave(recipe: Recipe): void {
    if (!this.currentUser || this.savingRecipeIds.has(recipe.id)) return;
    const wasSaved = this.savedRecipeIds.has(recipe.id);
    const request = wasSaved
      ? this.recipesService.unsaveRecipe(recipe.id)
      : this.recipesService.saveRecipe(recipe.id);
    this.savingRecipeIds.add(recipe.id);
    request.pipe(finalize(() => this.savingRecipeIds.delete(recipe.id)), takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (wasSaved) this.savedRecipeIds.delete(recipe.id);
        else this.savedRecipeIds.add(recipe.id);
        if (this.isOwnProfile()) this.loadSavedRecipes();
      },
      error: () => this.snackBar.open('Failed to update saved recipe', 'Close', { duration: 3000 })
    });
  }

  private refreshRecipes(): void {
    if (!this.user?.id) return;
    this.loadUserRecipes(this.user.id);
    if (this.isOwnProfile()) this.loadSavedRecipes();
  }

  canEditRecipe(recipe: Recipe): boolean {
    return this.currentUser?.id === recipe.createdBy.id;
  }
  trackRecipe(_index: number, recipe: Recipe): string {
    return recipe.id;
  }

}
