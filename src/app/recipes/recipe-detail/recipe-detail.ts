import { instructionsToHtml } from '../../shared/quill/instructions-html';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card';
import { RecipesService, Recipe, InstructionRecipe, DEFAULT_ANALYTICAL_FILTER } from '../../core/recipes.service';
import { AuthService } from '../../core/auth.service';
import { BehaviorSubject, combineLatest, forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, map, switchMap, finalize } from 'rxjs/operators';
import { formatQuantityAmount } from '../../shared/utils/quantity-format';

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
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    RecipeCardComponent
  ],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss',
})
export class RecipeDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private recipeRequest?: Subscription;
  private recommendationRequest?: Subscription;
  private subRecipeRequest?: Subscription;
  private readonly visibleRecipeIds = new BehaviorSubject<string[]>([]);
  recipe: Recipe | null = null;
  loading = false;
  error: string | null = null;
  canEdit$!: Observable<boolean>;
  isLoggedIn$!: Observable<boolean>;
  isSaved = false;
  saving = false;
  instructionsHtml = '';
  displayServings: number = 1;
  scaleFactor: number = 1;
  subRecipes: Array<{ component: InstructionRecipe; recipe: Recipe; instructionsHtml: string }> = [];
  loadingSubRecipes = false;

  recommendedRecipes: Recipe[] = [];
  loadingRecommendedRecipes = false;
  savedRecipeIds = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipesService: RecipesService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.canEdit$ = this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !this.recipe) return false;
        return user.id === this.recipe.createdBy.id;
      })
    );

    this.isLoggedIn$ = this.authService.currentUser$.pipe(
      map(user => user !== null)
    );

    combineLatest([this.authService.currentUser$, this.visibleRecipeIds]).pipe(
      switchMap(([user, ids]) => {
        if (!user?.id || ids.length === 0) return of([]);
        return this.recipesService.listRecipes({ ids, savedByUser: user.id, limit: ids.length }).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(recipes => {
      this.savedRecipeIds = new Set(recipes.map(recipe => recipe.id));
      this.isSaved = !!this.recipe && this.savedRecipeIds.has(this.recipe.id);
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
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
    this.recommendationRequest?.unsubscribe();
    this.recommendedRecipes = [];
    this.updateVisibleRecipeIds();
    this.loadingRecommendedRecipes = true;
    this.recommendationRequest = this.recipesService.listRecipes({
      analyzedRecipe: recipeId,
      ingredientSimilarity: DEFAULT_ANALYTICAL_FILTER,
      coSaveSimilarity: DEFAULT_ANALYTICAL_FILTER,
      tagSimilarity: DEFAULT_ANALYTICAL_FILTER,
      limit: 5
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (recipes) => {
        this.recommendedRecipes = recipes || [];
        this.updateVisibleRecipeIds();
        this.loadingRecommendedRecipes = false;
      },
      error: (err) => {
        console.error('Error loading recommendations:', err);
        this.loadingRecommendedRecipes = false;
      }
    });
  }

  loadRecipe(id?: string): void {
    const recipeId = id || this.route.snapshot.paramMap.get('id');
    if (!recipeId) return;

    this.recipeRequest?.unsubscribe();
    this.subRecipeRequest?.unsubscribe();
    this.recipe = null;
    this.subRecipes = [];
    this.loadingSubRecipes = false;
    this.loading = true;
    this.error = null;

    this.recipeRequest = this.recipesService.getRecipe(recipeId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        this.updateVisibleRecipeIds();
        this.isSaved = this.savedRecipeIds.has(recipe.id);
        // Initialize servings scaling
        this.displayServings = recipe.servings;
        this.scaleFactor = 1;
        this.instructionsHtml = instructionsToHtml(recipe.instructions);
        this.loadSubRecipes(recipe);
        this.loading = false;

        // Re-evaluate canEdit$ after recipe is loaded
        this.canEdit$ = this.authService.currentUser$.pipe(
          map(user => {
            if (!user || !this.recipe) return false;
            return user.id === this.recipe.createdBy.id;
          })
        );
      },
      error: (err) => {
        console.error('Error loading recipe:', err);
        this.error = 'We couldn’t load the recipe. Please check your connection and try again.';
        this.loading = false;
      }
    });
  }

  private loadSubRecipes(recipe: Recipe): void {
    this.subRecipes = [];
    const components = recipe.recipeIngredients || [];
    this.loadingSubRecipes = components.length > 0;
    if (components.length === 0) return;

    this.subRecipeRequest = forkJoin(components.map(component => this.recipesService.getRecipe(component.recipe.id))).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: recipes => {
        this.subRecipes = recipes.map((subRecipe, index) => ({
          component: components[index],
          recipe: subRecipe,
          instructionsHtml: instructionsToHtml(subRecipe.instructions)
        }));
        this.loadingSubRecipes = false;
      },
      error: err => {
        console.error('Error loading recipe ingredients:', err);
        this.loadingSubRecipes = false;
      }
    });
  }

  private updateVisibleRecipeIds(): void {
    this.visibleRecipeIds.next(Array.from(new Set([
      ...(this.recipe ? [this.recipe.id] : []),
      ...this.recommendedRecipes.map(recipe => recipe.id)
    ])));
  }

  printRecipe(): void {
    if (!this.loadingSubRecipes) {
      window.print();
    }
  }

  async openEditDialog(): Promise<void> {
    if (!this.recipe) return;

    const { RecipeEditDialogComponent } = await import('../recipe-edit-dialog/recipe-edit-dialog');
    if (this.destroyRef.destroyed) return;
    const dialogRef = this.dialog.open(RecipeEditDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      data: { recipe: this.recipe }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRecipe();
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
    if (!this.recipe || this.saving) return;
    const recipeId = this.recipe.id;
    const wasSaved = this.isSaved;
    const request = wasSaved ? this.recipesService.unsaveRecipe(recipeId) : this.recipesService.saveRecipe(recipeId);
    this.saving = true;
    request.pipe(finalize(() => this.saving = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (wasSaved) this.savedRecipeIds.delete(recipeId);
        else this.savedRecipeIds.add(recipeId);
        if (this.recipe?.id === recipeId) this.isSaved = !wasSaved;
        this.snackBar.open(wasSaved ? 'Recipe removed from saved recipes' : 'Recipe saved', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to update saved recipe', 'Close', { duration: 3000 })
    });
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

  getFormattedScaledAmount(amount: number, unit: any): string {
    return formatQuantityAmount(
      amount * this.scaleFactor,
      this.getUnitName(unit)
    );
  }

  getFormattedSubRecipeScaledAmount(
    entry: { component: InstructionRecipe; recipe: Recipe },
    amount: number,
    unit: any
  ): string {
    const componentUnit = this.getUnitName(entry.component.quantity.unit);
    const servingScale = componentUnit === 'serving'
      ? entry.component.quantity.amount / entry.recipe.servings
      : 1;
    return formatQuantityAmount(
      amount * servingScale * this.scaleFactor,
      this.getUnitName(unit)
    );
  }

  async copyIngredientsCsv(): Promise<void> {
    if (!this.recipe) return;

    const rows = [
      ['Type', 'Name', 'Amount', 'Unit', 'Description'],
      ...this.recipe.ingredients.map(ingredient => [
        'Ingredient',
        ingredient.ingredient.name,
        this.getFormattedScaledAmount(ingredient.quantity.amount, ingredient.quantity.unit),
        this.getUnitName(ingredient.quantity.unit),
        ingredient.description || ''
      ]),
      ...(this.recipe.recipeIngredients || []).map(component => [
        'Recipe',
        component.recipe.name,
        this.getFormattedScaledAmount(component.quantity.amount, component.quantity.unit),
        this.getUnitName(component.quantity.unit),
        component.description || ''
      ])
    ];
    const csv = rows
      .map(row => row.map(value => this.escapeCsvValue(value)).join(','))
      .join('\r\n');

    try {
      await navigator.clipboard.writeText(csv);
      this.snackBar.open('Ingredients copied as CSV', 'Close', { duration: 3000 });
    } catch {
      this.snackBar.open('Failed to copy ingredients', 'Close', { duration: 3000 });
    }
  }

  private escapeCsvValue(value: string | number): string {
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  trackRecipe(_index: number, recipe: Recipe): string {
    return recipe.id;
  }

}
