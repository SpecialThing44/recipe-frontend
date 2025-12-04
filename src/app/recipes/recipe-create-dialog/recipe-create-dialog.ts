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
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { QuillModule } from 'ngx-quill';
import { RecipeIngredientsFormComponent } from '../recipe-ingredients-form/recipe-ingredients-form';
import { TagsFormComponent } from '../../shared/components/tags-form/tags-form';
import { RecipesService, RecipeInput, RecipeIngredientInput } from '../../core/recipes.service';

import { CountriesService, Country } from '../../core/countries.service';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {wikipediaUrlValidator} from '../../shared/validators/wikipedia-url-validator';
import {getQuillModules} from '../../shared/quill/quill-modules';

@Component({
  selector: 'app-recipe-create-dialog',
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
    MatSelectModule,
    MatAutocompleteModule,
    QuillModule,
    RecipeIngredientsFormComponent,
    TagsFormComponent
  ],
  templateUrl: './recipe-create-dialog.html',
  styleUrl: './recipe-create-dialog.scss',
})
export class RecipeCreateDialogComponent {
  recipeForm: FormGroup;
  saving = false;
  countrySuggestions!: Observable<Country[]>;
  selectedImage: File | null = null;
  quillEditor: any;
  createdRecipeId: string | null = null;

  quillModules = getQuillModules(this.imageHandler)

  constructor(
    private fb: FormBuilder,
    private recipesService: RecipesService,
    private countriesService: CountriesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.recipeForm = this.fb.group({
      name: ['', Validators.required],
      prepTime: [0, [Validators.required, Validators.min(0)]],
      cookTime: [0, [Validators.required, Validators.min(0)]],
      countryOfOrigin: [''],
      wikiLink: ['', wikipediaUrlValidator],
      vegan: [false],
      vegetarian: [false],
      public: [true],
      tags: this.fb.array([]),
      ingredients: this.fb.array([]),
      instructions: ['', Validators.required]
    });

    // When vegan is checked, automatically check vegetarian
    this.recipeForm.get('vegan')?.valueChanges.subscribe(isVegan => {
      if (isVegan) {
        this.recipeForm.patchValue({ vegetarian: true }, { emitEvent: false });
      }
    });

    // Setup country autocomplete
    this.countrySuggestions = this.recipeForm.get('countryOfOrigin')!.valueChanges.pipe(
      startWith(''),
      map(value => {
        const searchTerm = typeof value === 'string' ? value : value?.name || '';
        return this.countriesService.filterCountries(searchTerm);
      })
    );
  }

  get tags(): FormArray {
    return this.recipeForm.get('tags') as FormArray;
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  onEditorCreated(editor: any): void {
    this.quillEditor = editor;
  }

  imageHandler(): void {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file && this.createdRecipeId) {
        const range = this.quillEditor.getSelection(true);

        // Upload image to backend
        this.recipesService.uploadInstructionImage(this.createdRecipeId, file).subscribe({
          next: (response) => {
            // Insert image URL into editor
            this.quillEditor.insertEmbed(range.index, 'image', response.url);
            this.quillEditor.setSelection(range.index + 1);
          },
          error: (err) => {
            console.error('Error uploading instruction image:', err);
            this.snackBar.open('Failed to upload image', 'Close', { duration: 3000 });
          }
        });
      } else if (!this.createdRecipeId) {
        this.snackBar.open('Please save the recipe first before adding images to instructions', 'Close', { duration: 3000 });
      }
    };
  }

  displayCountry(country: Country | string | null): string {
    if (!country) return '';
    return typeof country === 'string' ? country : country.name;
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
    }
  }

  onSubmit(): void {
    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formValue = this.recipeForm.value;

    // Build ingredients array
    const recipeIngredients: RecipeIngredientInput[] = formValue.ingredients.map((ing: any) => ({
      ingredientId: ing.ingredientId,
      quantity: {
        amount: ing.amount,
        unit: ing.unit
      },
      description: ing.description || undefined
    }));

    // Get instructions as Quill Delta object and stringify for backend
    const delta = this.quillEditor?.getContents();
    const instructionsJson = JSON.stringify(delta);

    // Extract country name if Country object selected
    const countryValue = formValue.countryOfOrigin;
    const countryName = countryValue && typeof countryValue === 'object' ? countryValue.name : countryValue;

    const input: RecipeInput = {
      name: formValue.name,
      tags: formValue.tags.filter((t: string) => t.trim() !== ''),
      ingredients: recipeIngredients,
      prepTime: formValue.prepTime,
      cookTime: formValue.cookTime,
      vegetarian: formValue.vegetarian,
      vegan: formValue.vegan,
      countryOfOrigin: countryName || undefined,
      public: formValue.public,
      wikiLink: formValue.wikiLink || undefined,
      instructions: instructionsJson
    };

    this.recipesService.createRecipe(input).subscribe({
      next: (recipe) => {
        this.createdRecipeId = recipe.id;

        // Upload image if selected
        if (this.selectedImage) {
          this.recipesService.uploadRecipeImage(recipe.id, this.selectedImage).subscribe({
            next: () => {
              this.snackBar.open('Recipe created successfully with image', 'Close', { duration: 3000 });
              this.dialog.closeAll();
            },
            error: (err) => {
              console.error('Error uploading recipe image:', err);
              this.snackBar.open('Recipe created but image upload failed', 'Close', { duration: 3000 });
              this.dialog.closeAll();
            }
          });
        } else {
          this.snackBar.open('Recipe created successfully', 'Close', { duration: 3000 });
          this.dialog.closeAll();
        }
      },
      error: (err) => {
        console.error('Error creating recipe:', err);
        this.snackBar.open('Failed to create recipe', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
