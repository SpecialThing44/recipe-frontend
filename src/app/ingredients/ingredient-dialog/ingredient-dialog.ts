import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { IngredientsService, Ingredient, IngredientInput } from '../../core/ingredients.service';
import { TagsService } from '../../core/tags.service';
import { TagsFormComponent } from '../../shared/components/tags-form/tags-form';
import { AliasesFormComponent } from '../../shared/components/aliases-form/aliases-form';
import { wikipediaUrlValidator } from '../../shared/validators/wikipedia-url-validator';
import { AuthService } from '../../core/auth.service';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-ingredient-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDialogModule,
    MatChipsModule,
    MatAutocompleteModule,
    TagsFormComponent,
    AliasesFormComponent
  ],
  templateUrl: './ingredient-dialog.html',
  styleUrl: './ingredient-dialog.scss',
})
export class IngredientDialogComponent {
  ingredientForm: FormGroup;
  saving = false;
  isEditMode = false;
  isAdmin$: Observable<boolean>;

  substitutes: Ingredient[] = [];
  loadingSubstitutes = false;

  candidateSearchControl = new FormControl('', { nonNullable: true });
  loadingCandidates = false;
  candidateResults: Ingredient[] = [];
  addingSubstitute = false;
  removingSubstituteId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private ingredientsService: IngredientsService,
    private tagsService: TagsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<IngredientDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { ingredient?: Ingredient }
  ) {
    const ingredient = data?.ingredient;
    this.isEditMode = !!ingredient;
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.admin === true)
    );

    this.ingredientForm = this.fb.group({
      name: [ingredient?.name || '', Validators.required],
      wikiLink: [ingredient?.wikiLink || '', [Validators.required, wikipediaUrlValidator]],
      aliases: this.fb.array([]),
      tags: this.fb.array([])
    });

    if (ingredient) {
      // Populate aliases
      ingredient.aliases.forEach(alias => {
        this.aliases.push(this.fb.control(alias));
      });

      // Populate tags
      ingredient.tags.forEach(tag => {
        this.tags.push(this.fb.control(tag));
      });

      this.loadSubstitutes();
    }
  }

  get aliases(): FormArray {
    return this.ingredientForm.get('aliases') as FormArray;
  }

  get tags(): FormArray {
    return this.ingredientForm.get('tags') as FormArray;
  }

  onSubmit(): void {
    if (this.ingredientForm.invalid) {
      return;
    }

    this.saving = true;
    const formValue = this.ingredientForm.value;

    const input: IngredientInput = {
      name: formValue.name,
      wikiLink: formValue.wikiLink,
      aliases: formValue.aliases.filter((a: string) => a.trim() !== ''),
      tags: formValue.tags.filter((t: string) => t.trim() !== '')
    };

    if (this.isEditMode && this.data?.ingredient) {
      this.ingredientsService.updateIngredient(this.data.ingredient.id, input).subscribe({
        next: (ingredient) => {
          this.snackBar.open('Ingredient updated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(ingredient);
        },
        error: (err) => {
          console.error('Error updating ingredient:', err);
          this.snackBar.open('Failed to update ingredient', 'Close', { duration: 3000 });
          this.saving = false;
        }
      });
    } else {
      this.ingredientsService.createIngredient(input).subscribe({
        next: (ingredient) => {
          this.snackBar.open('Ingredient created successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(ingredient);
        },
        error: (err) => {
          console.error('Error creating ingredient:', err);
          this.snackBar.open('Failed to create ingredient', 'Close', { duration: 3000 });
          this.saving = false;
        }
      });
    }
  }

  loadSubstitutes(): void {
    const ingredientId = this.data?.ingredient?.id;
    if (!ingredientId) {
      this.substitutes = [];
      return;
    }

    this.loadingSubstitutes = true;
    this.ingredientsService.listSubstitutes(ingredientId).subscribe({
      next: (substitutes) => {
        this.substitutes = substitutes;
        this.loadingSubstitutes = false;
      },
      error: (err) => {
        console.error('Error loading substitutes:', err);
        this.loadingSubstitutes = false;
        this.snackBar.open('Failed to load substitutes', 'Close', { duration: 3000 });
      }
    });
  }

  searchSubstituteCandidates(): void {
    const ingredientId = this.data?.ingredient?.id;
    if (!ingredientId) {
      this.candidateResults = [];
      return;
    }

    const search = this.candidateSearchControl.value.trim();
    if (!search) {
      this.candidateResults = [];
      return;
    }

    this.loadingCandidates = true;
    this.ingredientsService
      .listIngredients({
        aliasesOrName: [search.toLowerCase()],
        limit: 10,
        orderBy: { name: true }
      })
      .subscribe({
        next: (results) => {
          const existingSubstituteIds = new Set(this.substitutes.map(substitute => substitute.id));
          this.candidateResults = results.filter(candidate =>
            candidate.id !== ingredientId && !existingSubstituteIds.has(candidate.id)
          );
          this.loadingCandidates = false;
        },
        error: (err) => {
          console.error('Error searching substitute candidates:', err);
          this.loadingCandidates = false;
          this.snackBar.open('Failed to search ingredients', 'Close', { duration: 3000 });
        }
      });
  }

  addSubstitute(candidate: Ingredient): void {
    const ingredientId = this.data?.ingredient?.id;
    if (!ingredientId) {
      return;
    }

    this.addingSubstitute = true;
    this.ingredientsService.addSubstitute(ingredientId, candidate.id).subscribe({
      next: () => {
        this.addingSubstitute = false;
        this.snackBar.open('Substitute added', 'Close', { duration: 3000 });
        this.loadSubstitutes();
        this.searchSubstituteCandidates();
      },
      error: (err) => {
        console.error('Error adding substitute:', err);
        this.addingSubstitute = false;
        this.snackBar.open('Failed to add substitute', 'Close', { duration: 3000 });
      }
    });
  }

  removeSubstitute(substitute: Ingredient): void {
    const ingredientId = this.data?.ingredient?.id;
    if (!ingredientId) {
      return;
    }

    this.removingSubstituteId = substitute.id;
    this.ingredientsService.removeSubstitute(ingredientId, substitute.id).subscribe({
      next: () => {
        this.removingSubstituteId = null;
        this.snackBar.open('Substitute removed', 'Close', { duration: 3000 });
        this.loadSubstitutes();
        this.searchSubstituteCandidates();
      },
      error: (err) => {
        console.error('Error removing substitute:', err);
        this.removingSubstituteId = null;
        this.snackBar.open('Failed to remove substitute', 'Close', { duration: 3000 });
      }
    });
  }
}
