import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RecipeCardComponent } from '../shared/components/recipe-card/recipe-card';
import { RecipeCreateDialogComponent } from '../recipes/recipe-create-dialog/recipe-create-dialog';
import { RecipeEditDialogComponent } from '../recipes/recipe-edit-dialog/recipe-edit-dialog';
import { AuthService, User } from '../core/auth.service';
import { RecipesService, Recipe, DEFAULT_ANALYTICAL_FILTER } from '../core/recipes.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    RecipeCardComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private myRecipeRequest?: Subscription;
  private savedRecipeRequest?: Subscription;
  private recommendationRequest?: Subscription;
  currentUser: User | null = null;
  myRecipes: Recipe[] = [];
  savedRecipes: Recipe[] = [];
  recommendedRecipes: Recipe[] = [];
  loadingMyRecipes = false;
  loadingSavedRecipes = false;
  loadingRecommendedRecipes = false;
  savedRecipeIds = new Set<string>();

  constructor(
    private authService: AuthService,
    private recipesService: RecipesService,
    private dialog: MatDialog
  ) {}

  editRecipe(recipe: Recipe) {
    const dialogRef = this.dialog.open(RecipeEditDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { recipe }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshRecipes();
      }
    });
  }

  deleteRecipe(recipe: Recipe) {
    if (confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
      this.recipesService.deleteRecipe(recipe.id).subscribe({
        next: () => {
          this.refreshRecipes();
        },
        error: (err: any) => {
          console.error('Error deleting recipe:', err);
        }
      });
    }
  }

  
  ngOnInit() {
    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      this.myRecipeRequest?.unsubscribe();
      this.savedRecipeRequest?.unsubscribe();
      this.recommendationRequest?.unsubscribe();
      this.myRecipes = [];
      this.savedRecipes = [];
      this.recommendedRecipes = [];
      this.savedRecipeIds.clear();
      this.loadingMyRecipes = false;
      this.loadingSavedRecipes = false;
      this.loadingRecommendedRecipes = false;
      this.currentUser = user;
      if (user) {
        this.loadMyRecipes();
        this.loadSavedRecipes();
        this.loadRecommendedRecipes();
      }
    });
  }

  private refreshRecipes(): void {
    this.loadMyRecipes();
    this.loadSavedRecipes();
    this.loadRecommendedRecipes();
  }

  loadMyRecipes() {
    if (!this.currentUser?.id) return;
    
    this.loadingMyRecipes = true;
    this.myRecipeRequest?.unsubscribe();
    this.myRecipeRequest = this.recipesService.listRecipes({
      belongsToUser: this.currentUser.id,
      limit: 10,
      page: 0
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (recipes: Recipe[]) => {
        this.myRecipes = recipes || [];
        this.loadingMyRecipes = false;
      },
      error: (err: any) => {
        console.error('Error loading my recipes:', err);
        this.loadingMyRecipes = false;
      }
    });
  }

  loadSavedRecipes() {
    if (!this.currentUser?.id) return;
    
    this.loadingSavedRecipes = true;
    this.savedRecipeRequest?.unsubscribe();
    this.savedRecipeRequest = this.recipesService.listRecipes({
      savedByUser: this.currentUser.id,
      limit: 10,
      page: 0
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (recipes: Recipe[]) => {
        this.savedRecipes = recipes || [];
        this.savedRecipeIds = new Set(recipes.map(r => r.id));
        this.loadingSavedRecipes = false;
      },
      error: (err: any) => {
        console.error('Error loading saved recipes:', err);
        this.loadingSavedRecipes = false;
      }
    });
  }

  loadRecommendedRecipes() {
    if (!this.currentUser?.id) return;
    
    this.loadingRecommendedRecipes = true;
    this.recommendationRequest?.unsubscribe();
    this.recommendationRequest = this.recipesService.listRecipes({
      analyzedUser: this.currentUser.id,
      ingredientSimilarity: DEFAULT_ANALYTICAL_FILTER,
      coSaveSimilarity: DEFAULT_ANALYTICAL_FILTER,
      tagSimilarity: DEFAULT_ANALYTICAL_FILTER,
      limit: 10,
      page: 0
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (recipes: Recipe[]) => {
        this.recommendedRecipes = recipes || [];
        this.loadingRecommendedRecipes = false;
      },
      error: (err: any) => {
        console.error('Error loading recommended recipes:', err);
        this.loadingRecommendedRecipes = false;
      }
    });
  }

  canEditRecipe(recipe: Recipe): boolean {
    return this.currentUser?.id === recipe.createdBy.id;
  }

  login() {
    this.authService.login();
  }

  createRecipe() {
    const dialogRef = this.dialog.open(RecipeCreateDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshRecipes();
      }
    });
  }
}
