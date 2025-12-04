import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { IngredientsService, IngredientInput } from '../../core/ingredients.service';
import { TagsService } from '../../core/tags.service';
import { TagsFormComponent } from '../../shared/components/tags-form/tags-form';
import { AliasesFormComponent } from '../../shared/components/aliases-form/aliases-form';
import {wikipediaUrlValidator} from '../../shared/validators/wikipedia-url-validator';

@Component({
  selector: 'app-ingredient-create-dialog',
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
  templateUrl: './ingredient-create-dialog.html',
  styleUrl: './ingredient-create-dialog.scss',
})
export class IngredientCreateDialogComponent {
  ingredientForm: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private ingredientsService: IngredientsService,
    private tagsService: TagsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.ingredientForm = this.fb.group({
      name: ['', Validators.required],
      wikiLink: ['', [Validators.required, wikipediaUrlValidator]],
      aliases: this.fb.array([]),
      tags: this.fb.array([]),
      vegan: [false],
      vegetarian: [false]
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

    this.ingredientsService.createIngredient(input).subscribe({
      next: (ingredient) => {
        this.snackBar.open('Ingredient created successfully', 'Close', { duration: 3000 });
        this.dialog.closeAll();
      },
      error: (err) => {
        console.error('Error creating ingredient:', err);
        this.snackBar.open('Failed to create ingredient', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
