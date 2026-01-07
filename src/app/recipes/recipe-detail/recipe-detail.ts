import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { QuillModule } from 'ngx-quill';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card';
import { RecipesService, Recipe, DEFAULT_ANALYTICAL_FILTER } from '../../core/recipes.service';
import { AuthService } from '../../core/auth.service';
import { RecipeEditDialogComponent } from '../recipe-edit-dialog/recipe-edit-dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    QuillModule,
    RecipeCardComponent
  ],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss',
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  loading = false;
  error: string | null = null;
  canEdit$!: Observable<boolean>;
  isLoggedIn$!: Observable<boolean>;
  isSaved = false;
  instructionsContent: any = null;
  displayServings: number = 1;
  scaleFactor: number = 1;

  recommendedRecipes: Recipe[] = [];
  loadingRecommendedRecipes = false;
  savedRecipeIds = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipesService: RecipesService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const recipeId = this.route.snapshot.paramMap.get('id');
    if (recipeId) {
      this.loadRecipe(recipeId);
    } else {
      this.error = 'No recipe ID provided';
    }

    this.canEdit$ = this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !this.recipe) return false;
        return user.id === this.recipe.createdBy.id;
      })
    );

    this.isLoggedIn$ = this.authService.currentUser$.pipe(
      map(user => user !== null)
    );

    // Load saved recipes for "isSaved" status in recommendations
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.recipesService.listRecipes({
          savedByUser: user.id,
          limit: 100 // Load more to cover more cases
        }).subscribe(recipes => {
            if (recipes) {
                this.savedRecipeIds = new Set(recipes.map(r => r.id));
            }
        });
      }
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
          // If the ID changed, reload everything
          if (this.recipe?.id !== id) {
             this.loadRecipe(id);
             this.loadRecommendedRecipes(id);
          }
      } else {
        this.error = 'No recipe ID provided';
      }
    });
  }

  loadRecommendedRecipes(recipeId: string) {
    this.loadingRecommendedRecipes = true;
    this.recipesService.listRecipes({
      analyzedRecipe: recipeId,
      ingredientSimilarity: DEFAULT_ANALYTICAL_FILTER,
      coSaveSimilarity: DEFAULT_ANALYTICAL_FILTER,
      tagSimilarity: DEFAULT_ANALYTICAL_FILTER,
      limit: 5
    }).subscribe({
      next: (recipes) => {
        this.recommendedRecipes = recipes || [];
        this.loadingRecommendedRecipes = false;
      },
      error: (err) => {
        console.error('Error loading recommendations:', err);
        this.loadingRecommendedRecipes = false;
      }
    });
  }

  viewRecipe(recipeId: string) {
    this.router.navigate(['/recipes', recipeId]);
  }

  loadRecipe(id?: string): void {
    const recipeId = id || this.route.snapshot.paramMap.get('id');
    if (!recipeId) return;

    this.loading = true;
    this.error = null;

    this.recipesService.getRecipe(recipeId).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        // Initialize servings scaling
        this.displayServings = recipe.servings;
        this.scaleFactor = 1;
        // Instructions come from backend as object or string
        try {
          if (typeof recipe.instructions === 'string') {
            // Sanitize string to handle control characters
            const sanitizedInstructions = recipe.instructions.replace(/\n/g, '\\n');
            this.instructionsContent = JSON.parse(sanitizedInstructions);
          } else {
            this.instructionsContent = recipe.instructions;
          }
        } catch (e) {
          console.error('Error parsing instructions:', e);
          this.instructionsContent = recipe.instructions;
        }
        this.loading = false;

        // Re-evaluate canEdit$ after recipe is loaded
        this.canEdit$ = this.authService.currentUser$.pipe(
          map(user => {
            if (!user || !this.recipe) return false;
            return user.id === this.recipe.createdBy.id;
          })
        );

        // Check if recipe is saved by current user
        this.authService.currentUser$.subscribe(user => {
          if (user && this.recipe) {
            this.recipesService.listRecipes({
              ids: [this.recipe.id],
              savedByUser: user.id
            }).subscribe(savedRecipes => {
              this.isSaved = savedRecipes.length > 0;
            });
          }
        });
      },
      error: (err) => {
        console.error('Error loading recipe:', err);
        this.error = err.message || 'Failed to load recipe';
        this.loading = false;
      }
    });
  }

  openEditDialog(): void {
    if (!this.recipe) return;

    const dialogRef = this.dialog.open(RecipeEditDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      data: { recipe: this.recipe }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadRecipe();
    });
  }

  deleteRecipe(): void {
    if (!this.recipe) return;

    if (!confirm(`Are you sure you want to delete "${this.recipe.name}"?`)) {
      return;
    }

    this.recipesService.deleteRecipe(this.recipe.id).subscribe({
      next: () => {
        this.snackBar.open('Recipe deleted successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/recipes']);
      },
      error: (err) => {
        console.error('Error deleting recipe:', err);
        this.snackBar.open('Failed to delete recipe', 'Close', { duration: 3000 });
      }
    });
  }

  toggleSave(): void {
    if (!this.recipe) return;

    if (this.isSaved) {
      this.recipesService.unsaveRecipe(this.recipe.id).subscribe({
        next: () => {
          this.isSaved = false;
          this.snackBar.open('Recipe removed from saved recipes', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error unsaving recipe:', err);
          this.snackBar.open('Failed to unsave recipe', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.recipesService.saveRecipe(this.recipe.id).subscribe({
        next: () => {
          this.isSaved = true;
          this.snackBar.open('Recipe saved successfully', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error saving recipe:', err);
          this.snackBar.open('Failed to save recipe', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getUnitName(unit: any): string {
    // Handle both string format and enum object format
    if (typeof unit === 'string') {
      return unit;
    }
    return unit?.name || 'piece';
  }

  onServingsChange(): void {
    if (!this.recipe) return;
    this.scaleFactor = this.displayServings / this.recipe.servings;
  }

  getScaledAmount(amount: number): number {
    return Math.round(amount * this.scaleFactor * 100) / 100;
  }
}
