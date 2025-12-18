import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { QuillModule } from 'ngx-quill';
import { RecipeIngredientsFormComponent } from '../recipe-ingredients-form/recipe-ingredients-form';
import { TagsFormComponent } from '../../shared/components/tags-form/tags-form';
import { RecipesService, Recipe, RecipeInput, RecipeIngredientInput } from '../../core/recipes.service';
import { CountriesService, Country } from '../../core/countries.service';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {wikipediaUrlValidator} from '../../shared/validators/wikipedia-url-validator';
import {getQuillModules} from '../../shared/quill/quill-modules';
import {availableUnits} from '../../shared/units/available-units';

function minLengthArray(min: number) {
  return (c: AbstractControl): {[key: string]: any} | null => {
    if (c.value.length >= min)
      return null;

    return { 'minLengthArray': {valid: false, minLength: min}};
  }
}

@Component({
  selector: 'app-recipe-edit-dialog',
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
  templateUrl: './recipe-edit-dialog.html',
  styleUrl: './recipe-edit-dialog.scss',
})
export class RecipeEditDialogComponent {
  recipeForm: FormGroup;
  saving = false;
  countrySuggestions!: Observable<Country[]>;
  selectedImage: File | null = null;
  quillEditor: any;
  recipeId: string;

  quillModules = getQuillModules(this.imageHandler)

  constructor(
    private fb: FormBuilder,
    private recipesService: RecipesService,
    private countriesService: CountriesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { recipe: Recipe }
  ) {
    this.recipeId = data.recipe.id;

    let instructions = data.recipe.instructions;
    if (typeof instructions === 'string') {
      try {
        // Sanitize string to handle control characters
        const sanitizedInstructions = instructions.replace(/\n/g, '\\n');
        instructions = JSON.parse(sanitizedInstructions);
      } catch (e) {
        console.error('Error parsing instructions in edit dialog:', e);
      }
    }

    this.recipeForm = this.fb.group({
      name: [data.recipe.name, Validators.required],
      prepTime: [data.recipe.prepTime, [Validators.required, Validators.min(0)]],
      cookTime: [data.recipe.cookTime, [Validators.required, Validators.min(0)]],
      countryOfOrigin: [data.recipe.countryOfOrigin || ''],
      wikiLink: [data.recipe.wikiLink || '', wikipediaUrlValidator],
      public: [data.recipe.public],
      tags: this.fb.array([]),
      ingredients: this.fb.array([], minLengthArray(1)),
      // Instructions comes as object from backend
      instructions: [instructions, Validators.required]
    });

    // Populate tags
    data.recipe.tags.forEach(tag => {
      const tagControl = this.fb.control(tag);
      this.tags.push(tagControl);
    });

    // Populate ingredients
    data.recipe.ingredients.forEach(ing => {
      const index = this.ingredients.length;
      // Handle unit - could be string or object with name property
      const unitValue = typeof ing.quantity.unit === 'string'
        ? ing.quantity.unit.toLowerCase()
        : (ing.quantity.unit as any).name?.toLowerCase() || 'piece';

      const ingredientGroup = this.fb.group({
        ingredientName: [ing.ingredient.name],
        ingredientId: [ing.ingredient.id, Validators.required],
        amount: [ing.quantity.amount, [Validators.required, Validators.min(0)]],
        unit: [unitValue, Validators.required],
        description: [ing.description || '']
      });
      this.ingredients.push(ingredientGroup);
    });

    // Setup country autocomplete
    this.countrySuggestions = this.recipeForm.get('countryOfOrigin')!.valueChanges.pipe(
      startWith(data.recipe.countryOfOrigin || ''),
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

  displayCountry(country: Country | string | null): string {
    if (!country) return '';
    return typeof country === 'string' ? country : country.name;
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
      if (file && this.recipeId) {
        const range = this.quillEditor.getSelection(true);

        // Upload image to backend
        this.recipesService.uploadInstructionImage(this.recipeId, file).subscribe({
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
      }
    };
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

    const input: Partial<RecipeInput> = {
      name: formValue.name,
      tags: formValue.tags.filter((t: string) => t.trim() !== ''),
      ingredients: recipeIngredients,
      prepTime: formValue.prepTime,
      cookTime: formValue.cookTime,
      countryOfOrigin: countryName || undefined,
      public: formValue.public,
      wikiLink: formValue.wikiLink || undefined,
      instructions: instructionsJson
    };

    this.recipesService.updateRecipe(this.recipeId, input).subscribe({
      next: (recipe) => {
        // Upload image if selected
        if (this.selectedImage) {
          this.recipesService.uploadRecipeImage(recipe.id, this.selectedImage).subscribe({
            next: () => {
              this.snackBar.open('Recipe updated successfully with image', 'Close', { duration: 3000 });
              this.dialog.closeAll();
            },
            error: (err) => {
              console.error('Error uploading recipe image:', err);
              this.snackBar.open('Recipe updated but image upload failed', 'Close', { duration: 3000 });
              this.dialog.closeAll();
            }
          });
        } else {
          this.snackBar.open('Recipe updated successfully', 'Close', { duration: 3000 });
          this.dialog.closeAll();
        }
      },
      error: (err) => {
        console.error('Error updating recipe:', err);
        this.snackBar.open('Failed to update recipe', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  protected readonly availableUnits = availableUnits;
}
