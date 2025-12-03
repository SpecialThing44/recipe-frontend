import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecipesService, Recipe, RecipesFilters } from '../../core/recipes.service';
import { AuthService } from '../../core/auth.service';
import { RecipeCreateDialogComponent } from '../recipe-create-dialog/recipe-create-dialog';
import { RecipeEditDialogComponent } from '../recipe-edit-dialog/recipe-edit-dialog';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

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
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './recipes-list.html',
  styleUrl: './recipes-list.scss',
})
export class RecipesListComponent implements OnInit {
  recipes: Recipe[] = [];
  loading = false;
  error: string | null = null;
  isLoggedIn$!: Observable<boolean>;

  filterForm: FormGroup;
  
  filterTypes = [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' }
  ];

  pageSizes = [10, 25, 50, 100];
  currentPage = 0;
  pageSize = 25;

  sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'none', label: 'No Sorting' }
  ];

  constructor(
    private recipesService: RecipesService,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      id: [''],
      nameFilterType: ['contains'],
      nameValue: [''],
      vegetarian: [null],
      vegan: [null],
      publicOnly: [null],
      sort: ['none'],
      pageSize: [25]
    });
  }

  ngOnInit(): void {
    this.isLoggedIn$ = this.authService.currentUser$.pipe(
      map(user => user !== null)
    );
    
    this.loadRecipes();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadRecipes();
      });
  }

  loadRecipes(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.value;
    const filters: RecipesFilters = {
      limit: formValue.pageSize || this.pageSize,
      page: this.currentPage
    };

    if (formValue.id?.trim()) {
      filters.id = formValue.id.trim();
    }

    if (formValue.nameValue?.trim()) {
      filters.name = {};
      const nameFilterType = formValue.nameFilterType || 'contains';
      filters.name[nameFilterType as keyof typeof filters.name] = formValue.nameValue.trim();
    }

    if (formValue.vegetarian !== null) {
      filters.vegetarian = formValue.vegetarian;
    }

    if (formValue.vegan !== null) {
      filters.vegan = formValue.vegan;
    }

    if (formValue.publicOnly !== null) {
      filters.public = formValue.publicOnly;
    }

    if (formValue.sort && formValue.sort !== 'none') {
      const [field, direction] = formValue.sort.split('-');
      if (field === 'name') {
        filters.orderBy = { name: direction === 'asc' };
      }
    }

    this.recipesService.listRecipes(filters).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading recipes:', err);
        this.error = err.message || 'Failed to load recipes';
        this.loading = false;
        this.recipes = [];
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      id: '',
      nameFilterType: 'contains',
      nameValue: '',
      vegetarian: null,
      vegan: null,
      publicOnly: null,
      sort: 'none',
      pageSize: 25
    });
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
    this.pageSize = this.filterForm.value.pageSize;
    this.currentPage = 0;
    this.loadRecipes();
  }

  viewRecipe(recipeId: string): void {
    this.router.navigate(['/recipes', recipeId]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(RecipeCreateDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadRecipes();
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

    dialogRef.afterClosed().subscribe(() => {
      this.loadRecipes();
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

  canEditRecipe(recipe: Recipe): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        return user.id === recipe.createdBy.id;
      })
    );
  }
}

