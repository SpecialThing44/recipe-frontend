import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { IngredientsService, Ingredient, IngredientsFilters } from '../../core/ingredients.service';
import { AuthService } from '../../core/auth.service';
import { IngredientCreateDialogComponent } from '../ingredient-create-dialog/ingredient-create-dialog';
import { IngredientEditDialogComponent } from '../ingredient-edit-dialog/ingredient-edit-dialog';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-ingredients-list',
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
  templateUrl: './ingredients-list.html',
  styleUrl: './ingredients-list.scss',
})
export class IngredientsListComponent implements OnInit {
  ingredients: Ingredient[] = [];
  loading = false;
  error: string | null = null;
  isAdmin$!: Observable<boolean>;

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
    private ingredientsService: IngredientsService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      id: [''],
      nameFilterType: ['contains'],
      nameValue: [''],
      vegetarian: [null],
      vegan: [null],
      sort: ['none'],
      pageSize: [25]
    });
  }

  ngOnInit(): void {
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.admin === true)
    );
    
    this.loadIngredients();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadIngredients();
      });
  }

  loadIngredients(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.value;
    const filters: IngredientsFilters = {
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

    if (formValue.sort && formValue.sort !== 'none') {
      const [field, direction] = formValue.sort.split('-');
      if (field === 'name') {
        filters.orderBy = { name: direction === 'asc' };
      }
    }

    this.ingredientsService.listIngredients(filters).subscribe({
      next: (ingredients) => {
        this.ingredients = ingredients;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ingredients:', err);
        this.error = err.message || 'Failed to load ingredients';
        this.loading = false;
        this.ingredients = [];
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
      sort: 'none',
      pageSize: 25
    });
    this.currentPage = 0;
    this.loadIngredients();
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadIngredients();
    }
  }

  nextPage(): void {
    if (this.ingredients.length === this.pageSize) {
      this.currentPage++;
      this.loadIngredients();
    }
  }

  onPageSizeChange(): void {
    this.pageSize = this.filterForm.value.pageSize;
    this.currentPage = 0;
    this.loadIngredients();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(IngredientCreateDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadIngredients();
    });
  }

  openEditDialog(ingredient: Ingredient): void {
    const dialogRef = this.dialog.open(IngredientEditDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { ingredient }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadIngredients();
    });
  }

  deleteIngredient(ingredient: Ingredient): void {
    if (!confirm(`Are you sure you want to delete "${ingredient.name}"?`)) {
      return;
    }

    this.ingredientsService.deleteIngredient(ingredient.id).subscribe({
      next: () => {
        this.snackBar.open('Ingredient deleted successfully', 'Close', { duration: 3000 });
        this.loadIngredients();
      },
      error: (err) => {
        console.error('Error deleting ingredient:', err);
        this.snackBar.open('Failed to delete ingredient', 'Close', { duration: 3000 });
      }
    });
  }
}

