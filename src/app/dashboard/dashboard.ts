import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
    RecipeCardComponent,
    RecipeEditDialogComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
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
    private router: Router,
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
        this.loadMyRecipes();
      }
    });
  }

  deleteRecipe(recipe: Recipe) {
    if (confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
      this.recipesService.deleteRecipe(recipe.id).subscribe({
        next: () => {
          this.loadMyRecipes();
        },
        error: (err: any) => {
          console.error('Error deleting recipe:', err);
        }
      });
    }
  }

  
  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadMyRecipes();
        this.loadSavedRecipes();
        this.loadRecommendedRecipes();
      }
    });
  }

  loadMyRecipes() {
    if (!this.currentUser?.id) return;
    
    this.loadingMyRecipes = true;
    this.recipesService.listRecipes({
      belongsToUser: this.currentUser.id,
      limit: 10,
      page: 0
    }).subscribe({
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
    this.recipesService.listRecipes({
      savedByUser: this.currentUser.id,
      limit: 10,
      page: 0
    }).subscribe({
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
    this.recipesService.listRecipes({
      analyzedUser: this.currentUser.id,
      ingredientSimilarity: DEFAULT_ANALYTICAL_FILTER,
      coSaveSimilarity: DEFAULT_ANALYTICAL_FILTER,
      tagSimilarity: DEFAULT_ANALYTICAL_FILTER,
      limit: 10,
      page: 0
    }).subscribe({
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

  viewRecipe(recipeId: string) {
    this.router.navigate(['/recipes', recipeId]);
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
        this.loadMyRecipes();
      }
    });
  }
}
