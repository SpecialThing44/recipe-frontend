import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
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

  constructor(
    private fb: FormBuilder,
    private ingredientsService: IngredientsService,
    private tagsService: TagsService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<IngredientDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { ingredient?: Ingredient }
  ) {
    const ingredient = data?.ingredient;
    this.isEditMode = !!ingredient;

    this.ingredientForm = this.fb.group({
      name: [ingredient?.name || '', Validators.required],
      wikiLink: [ingredient?.wikiLink || '', [Validators.required, wikipediaUrlValidator]],
      aliases: this.fb.array([]),
      tags: this.fb.array([]),
      vegan: [ingredient?.vegan || false],
      vegetarian: [ingredient?.vegetarian || false]
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
    }

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
      tags: formValue.tags.filter((t: string) => t.trim() !== ''),
      vegan: formValue.vegan,
      vegetarian: formValue.vegetarian
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
}
