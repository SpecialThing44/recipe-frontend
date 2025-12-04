import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { IngredientsService, Ingredient, IngredientInput } from '../../core/ingredients.service';
import { TagsService } from '../../core/tags.service';
import { debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { TagsFormComponent } from '../../shared/components/tags-form/tags-form';
import { wikipediaUrlValidator } from '../../shared/validators/wikipedia-url-validator';

@Component({
  selector: 'app-ingredient-edit-dialog',
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
    TagsFormComponent
  ],
  templateUrl: './ingredient-edit-dialog.html',
  styleUrl: './ingredient-edit-dialog.scss',
})
export class IngredientEditDialogComponent {
  ingredientForm: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private ingredientsService: IngredientsService,
    private tagsService: TagsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { ingredient: Ingredient }
  ) {
    this.ingredientForm = this.fb.group({
      name: [data.ingredient.name, Validators.required],
      wikiLink: [data.ingredient.wikiLink, [Validators.required, wikipediaUrlValidator]],
      aliases: this.fb.array([]),
      tags: this.fb.array([]),
      vegan: [data.ingredient.vegan],
      vegetarian: [data.ingredient.vegetarian]
    });

    // Populate aliases
    data.ingredient.aliases.forEach(alias => {
      this.aliases.push(this.fb.control(alias));
    });

    // Populate tags
    data.ingredient.tags.forEach(tag => {
      this.tags.push(this.fb.control(tag));
    });

    // When vegan is checked, automatically check vegetarian
    this.ingredientForm.get('vegan')?.valueChanges.subscribe(isVegan => {
      if (isVegan) {
        this.ingredientForm.patchValue({ vegetarian: true }, { emitEvent: false });
      }
    });
  }

  get aliases(): FormArray {
    return this.ingredientForm.get('aliases') as FormArray;
  }

  get tags(): FormArray {
    return this.ingredientForm.get('tags') as FormArray;
  }

  addAlias(): void {
    this.aliases.push(this.fb.control(''));
  }

  removeAlias(index: number): void {
    this.aliases.removeAt(index);
  }

  onSubmit(): void {
    if (this.ingredientForm.invalid) {
      return;
    }

    this.saving = true;
    const formValue = this.ingredientForm.value;

    const input: Partial<IngredientInput> = {
      name: formValue.name,
      wikiLink: formValue.wikiLink,
      aliases: formValue.aliases.filter((a: string) => a.trim() !== ''),
      tags: formValue.tags.filter((t: string) => t.trim() !== ''),
      vegan: formValue.vegan,
      vegetarian: formValue.vegetarian
    };

    this.ingredientsService.updateIngredient(this.data.ingredient.id, input).subscribe({
      next: (ingredient) => {
        this.snackBar.open('Ingredient updated successfully', 'Close', { duration: 3000 });
        this.dialog.closeAll();
      },
      error: (err) => {
        console.error('Error updating ingredient:', err);
        this.snackBar.open('Failed to update ingredient', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
