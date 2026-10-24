import { Component, DestroyRef, inject, OnInit, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RecipesService, Recipe, RecipesFilters } from '../../core/recipes.service';
import { AuthService, User } from '../../core/auth.service';
import { IngredientsService, Ingredient } from '../../core/ingredients.service';
import { TagsService } from '../../core/tags.service';
import { RoutePrefetchService } from '../../core/route-prefetch.service';
import { RecipeCreateDialogComponent } from '../recipe-create-dialog/recipe-create-dialog';
import { RecipeEditDialogComponent } from '../recipe-edit-dialog/recipe-edit-dialog';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card';
import { debounceTime, distinctUntilChanged, map, switchMap, startWith, filter, catchError } from 'rxjs/operators';
import { combineLatest, Observable, of, Subject } from 'rxjs';

@Component({
  selector: 'app-recipes-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatTooltipModule,
    RecipeCardComponent
  ],
  templateUrl: './recipes-list.html',
  styleUrl: './recipes-list.scss',
})
export class RecipesListComponent implements OnInit {
  @Input() userId?: string; // If provided, filter recipes by this user
  @Input() showUserFilters: boolean = true; // Hide "My Recipes" and "Saved Recipes" when false
  @Input() showHeader: boolean = true; // Hide header when embedded
  
  recipes: Recipe[] = [];
  loading = false;
  error: string | null = null;
  isLoggedIn$!: Observable<boolean>;
  currentUser: User | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly recipeRequests = new Subject<RecipesFilters>();
  savedRecipeIds: Set<string> = new Set();

  filterForm: FormGroup;
  showAdvancedFilters = false;
  
  ingredientSuggestions: Observable<Ingredient[]> = of([]);
  notIngredientSuggestions: Observable<Ingredient[]> = of([]);
  tagSuggestions: Observable<string[]> = of([]);

  filterTypes = [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' }
  ];

  pageSizes = [10, 25, 50, 100];
  currentPage = 0;
  get pageSize(): number {
    return this.filterForm.get('pageSize')?.value || 25;
  }

  sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'none', label: 'No Sorting' }
  ];

  constructor(
    private recipesService: RecipesService,
    private ingredientsService: IngredientsService,
    private tagsService: TagsService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private routePrefetchService: RoutePrefetchService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      id: [''],
      nameFilterType: ['contains'],
      nameValue: [''],
      myRecipes: [false],
      savedRecipes: [false],
      createdByUser: [''],
      savedByUser: [''],
      prepTime: [null],
      cookTime: [null],
      ingredients: [[]],
      notIngredients: [[]],
      tags: [[]],
      ingredientInput: [''],
      notIngredientInput: [''],
      tagInput: [''],
      sort: ['none'],
      pageSize: [25]
    });
    this.recipeRequests.pipe(
      switchMap(filters => this.recipesService.listRecipes(filters).pipe(
        switchMap(recipes => {
          this.recipes = recipes;
          this.loading = false;
          this.prefetchVisibleRecipeDetails(recipes);
          if (!this.currentUser || recipes.length === 0) return of([]);
          return this.recipesService.listRecipes({
            ids: recipes.map(recipe => recipe.id), savedByUser: this.currentUser.id
          }).pipe(catchError(() => of([])));
        }),
        catchError(error => {
          console.error('Error loading recipes:', error);
          this.error = error.message || 'Failed to load recipes';
          this.loading = false;
          this.recipes = [];
          return of([]);
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(savedRecipes => {
      this.savedRecipeIds = new Set(savedRecipes.map(recipe => recipe.id));
    });
  }

  ngOnInit(): void {
    this.isLoggedIn$ = this.authService.currentUser$.pipe(map(user => user !== null));

    combineLatest([this.authService.currentUser$, this.authService.loading$]).pipe(
      filter(([, loading]) => !loading),
      map(([user]) => user),
      distinctUntilChanged((previous, current) => previous?.id === current?.id),
      switchMap(user => this.route.queryParams.pipe(map(params => ({ user, params })))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ user, params }) => {
      this.currentUser = user;
      this.resetFilters(params);
      this.currentPage = 0;
      this.loadRecipes();
    });
    this.setupAutocomplete();
  }

  setupAutocomplete(): void {
    this.ingredientSuggestions = this.filterForm.get('ingredientInput')!.valueChanges.pipe(
      startWith(''),
      debounceTime(100),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value !== 'string' || !value.trim()) return of([]);
        return this.ingredientsService.listIngredients({
          name: { contains: value.trim() },
          limit: 10
        }).pipe(
          map(results => {
            const selectedIngredients = new Set<string>(this.filterForm.get('ingredients')?.value || []);
            return results.filter(result => !selectedIngredients.has(result.name));
          })
        );
      })
    );

    this.notIngredientSuggestions = this.filterForm.get('notIngredientInput')!.valueChanges.pipe(
      startWith(''),
      debounceTime(100),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value !== 'string' || !value.trim()) return of([]);
        return this.ingredientsService.listIngredients({
          name: { contains: value.trim() },
          limit: 10
        }).pipe(
          map(results => {
            const selectedIngredients = new Set<string>(this.filterForm.get('notIngredients')?.value || []);
            return results.filter(result => !selectedIngredients.has(result.name));
          })
        );
      })
    );

    this.tagSuggestions = this.filterForm.get('tagInput')!.valueChanges.pipe(
      startWith(''),
      debounceTime(100),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value !== 'string' || !value.trim()) return of([]);
        return this.tagsService.listTags({
          name: { contains: value.trim() },
          limit: 10
        }).pipe(
          map(results => {
            const selectedTags = new Set<string>(this.filterForm.get('tags')?.value || []);
            return results.filter(result => !selectedTags.has(result));
          })
        );
      })
    );
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  addIngredient(
    event: MatAutocompleteSelectedEvent,
    type: 'ingredients' | 'notIngredients',
    inputElement?: HTMLInputElement
  ): void {
    const ingredient = event.option.value;
    const currentIngredients = this.filterForm.get(type)?.value || [];
    
    if (!currentIngredients.includes(ingredient.name)) {
      this.filterForm.patchValue({
        [type]: [...currentIngredients, ingredient.name]
      });
    }

    const inputControlName = type === 'ingredients' ? 'ingredientInput' : 'notIngredientInput';
    this.clearAutocompleteInput(inputControlName, inputElement);
  }

  removeIngredient(ingredient: string, type: 'ingredients' | 'notIngredients'): void {
    const currentIngredients = this.filterForm.get(type)?.value || [];
    this.filterForm.patchValue({
      [type]: currentIngredients.filter((i: string) => i !== ingredient)
    });
  }

  addTag(event: MatAutocompleteSelectedEvent, inputElement?: HTMLInputElement): void {
    const tag = event.option.value;
    const currentTags = this.filterForm.get('tags')?.value || [];
    
    if (!currentTags.includes(tag)) {
      this.filterForm.patchValue({
        tags: [...currentTags, tag]
      });
    }

    this.clearAutocompleteInput('tagInput', inputElement);
  }

  private clearAutocompleteInput(
    controlName: 'ingredientInput' | 'notIngredientInput' | 'tagInput',
    inputElement?: HTMLInputElement
  ): void {
    this.filterForm.get(controlName)?.setValue('');
    if (inputElement) {
      inputElement.value = '';
    }

    // Defer one tick so Material autocomplete cannot overwrite the cleared value.
    setTimeout(() => {
      this.filterForm.get(controlName)?.setValue('');
      if (inputElement) {
        inputElement.value = '';
      }
    });
  }

  removeTag(tag: string): void {
    const currentTags = this.filterForm.get('tags')?.value || [];
    this.filterForm.patchValue({
      tags: currentTags.filter((t: string) => t !== tag)
    });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadRecipes();
  }

  loadRecipes(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.value;
    const filters: RecipesFilters = {
      limit: this.pageSize,
      page: this.currentPage
    };
    
    // If userId is provided as input, filter by that user
    if (this.userId) {
      filters.belongsToUser = this.userId;
    }

    if (formValue.id?.trim()) {
      filters.id = formValue.id.trim();
    }

    if (formValue.nameValue?.trim()) {
      filters.name = {};
      const nameFilterType = formValue.nameFilterType || 'contains';
      filters.name[nameFilterType as keyof typeof filters.name] = formValue.nameValue.trim();
    }

    if (formValue.myRecipes && this.currentUser) {
      filters.belongsToUser = this.currentUser.id;
    }

    if (formValue.savedRecipes && this.currentUser) {
      filters.savedByUser = this.currentUser.id;
    }

    // URL parameter overrides for user filters
    if (formValue.createdByUser) {
      filters.belongsToUser = formValue.createdByUser;
    }

    if (formValue.savedByUser) {
      filters.savedByUser = formValue.savedByUser;
    }

    if (formValue.prepTime !== null) {
      filters.prepTime = { lessOrEqual: formValue.prepTime };
    }

    if (formValue.cookTime !== null) {
      filters.cookTime = { lessOrEqual: formValue.cookTime };
    }

    if (formValue.ingredients && formValue.ingredients.length > 0) {
      filters.ingredients = formValue.ingredients;
    }

    if (formValue.notIngredients && formValue.notIngredients.length > 0) {
      filters.notIngredients = formValue.notIngredients;
    }

    if (formValue.tags && formValue.tags.length > 0) {
      filters.tags = formValue.tags;
    }

    if (formValue.sort && formValue.sort !== 'none') {
      const [field, direction] = formValue.sort.split('-');
      if (field === 'name') {
        filters.orderBy = { name: direction === 'asc' };
      }
    }

    this.savedRecipeIds.clear();
    this.recipeRequests.next(filters);
  }

  private resetFilters(params: Params = {}): void {
    const pageSize = Number(params['pageSize']);
    const names = (value?: string) => value?.split(',').map(name => name.trim()).filter(Boolean) || [];
    this.filterForm.reset({
      id: params['id'] || '',
      nameFilterType: this.filterTypes.some(type => type.value === params['nameFilterType'])
        ? params['nameFilterType'] : 'contains',
      nameValue: params['nameValue'] || '',
      myRecipes: params['myRecipes'] === 'true',
      savedRecipes: params['savedRecipes'] === 'true',
      createdByUser: params['createdByUser'] || '',
      savedByUser: params['savedByUser'] || '',
      prepTime: params['prepTime'] !== undefined ? Number(params['prepTime']) : null,
      cookTime: params['cookTime'] !== undefined ? Number(params['cookTime']) : null,
      ingredients: names(params['ingredients']),
      notIngredients: names(params['notIngredients']),
      tags: names(params['tags']),
      ingredientInput: '', notIngredientInput: '', tagInput: '',
      sort: this.sortOptions.some(option => option.value === params['sort']) ? params['sort'] : 'none',
      pageSize: this.pageSizes.includes(pageSize) ? pageSize : 25
    }, { emitEvent: false });
  }

  clearFilters(): void {
    this.resetFilters();
    this.currentPage = 0;
    this.loadRecipes();
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadRecipes();
    }
  }

  nextPage(): void {
    if (this.recipes.length === this.pageSize) {
      this.currentPage++;
      this.loadRecipes();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadRecipes();
  }

  prefetchRecipeDetail(recipeId: string): void {
    this.routePrefetchService.prefetchPath(`/recipes/${recipeId}`);
  }

  private prefetchVisibleRecipeDetails(recipes: Recipe[]): void {
    const likelyRecipePaths = recipes
      .slice(0, 8)
      .map(recipe => `/recipes/${recipe.id}`);
    this.routePrefetchService.scheduleIdlePrefetch(likelyRecipePaths);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(RecipeCreateDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRecipes();
    });
  }

  openEditDialog(recipe: Recipe, event: Event): void {
    event.stopPropagation(); // Prevent card click navigation
    
    const dialogRef = this.dialog.open(RecipeEditDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      data: { recipe }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRecipes();
    });
  }

  deleteRecipe(recipe: Recipe, event: Event): void {
    event.stopPropagation(); // Prevent card click navigation

    if (!confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
      return;
    }

    this.recipesService.deleteRecipe(recipe.id).subscribe({
      next: () => {
        this.snackBar.open('Recipe deleted successfully', 'Close', { duration: 3000 });
        this.loadRecipes();
      },
      error: (err) => {
        console.error('Error deleting recipe:', err);
        this.snackBar.open('Failed to delete recipe', 'Close', { duration: 3000 });
      }
    });
  }

  toggleSave(recipe: Recipe, event: Event): void {
    event.stopPropagation();
    
    if (this.savedRecipeIds.has(recipe.id)) {
      this.recipesService.unsaveRecipe(recipe.id).subscribe({
        next: () => {
          this.savedRecipeIds.delete(recipe.id);
          this.snackBar.open('Recipe removed from saved recipes', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error unsaving recipe:', err);
          this.snackBar.open('Failed to unsave recipe', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.recipesService.saveRecipe(recipe.id).subscribe({
        next: () => {
          this.savedRecipeIds.add(recipe.id);
          this.snackBar.open('Recipe saved successfully', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error saving recipe:', err);
          this.snackBar.open('Failed to save recipe', 'Close', { duration: 3000 });
        }
      });
    }
  }

  canEditRecipe(recipe: Recipe): boolean {
    return this.currentUser?.id === recipe.createdBy.id;
  }

  // Wrapper methods for recipe card component
  toggleSaveFromCard(recipe: Recipe): void {
    this.toggleSave(recipe, new Event('click'));
  }

  openEditDialogFromCard(recipe: Recipe): void {
    this.openEditDialog(recipe, new Event('click'));
  }

  deleteRecipeFromCard(recipe: Recipe): void {
    this.deleteRecipe(recipe, new Event('click'));
  }
}
