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
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { QuillModule } from 'ngx-quill';
import { RecipesService, Recipe, RecipeInput, RecipeIngredientInput } from '../../core/recipes.service';
import { IngredientsService, Ingredient } from '../../core/ingredients.service';
import { TagsService } from '../../core/tags.service';
import { CountriesService, Country } from '../../core/countries.service';
import { debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

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
    QuillModule
  ],
  templateUrl: './recipe-edit-dialog.html',
  styleUrl: './recipe-edit-dialog.scss',
})
export class RecipeEditDialogComponent {
  recipeForm: FormGroup;
  saving = false;
  tagSuggestions: Observable<string[]>[] = [];
  ingredientSuggestions: Observable<Ingredient[]>[] = [];
  countrySuggestions!: Observable<Country[]>;
  selectedImage: File | null = null;
  quillEditor: any;
  recipeId: string;

  availableUnits = [
    { value: 'cup', label: 'Cup' },
    { value: 'milliliter', label: 'Milliliter' },
    { value: 'liter', label: 'Liter' },
    { value: 'teaspoon', label: 'Teaspoon' },
    { value: 'tablespoon', label: 'Tablespoon' },
    { value: 'piece', label: 'Piece' },
    { value: 'gram', label: 'Gram' },
    { value: 'kilogram', label: 'Kilogram' },
    { value: 'ounce', label: 'Ounce' },
    { value: 'pound', label: 'Pound' }
  ];

  quillModules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: () => this.imageHandler()
      }
    }
  };

  constructor(
    private fb: FormBuilder,
    private recipesService: RecipesService,
    private ingredientsService: IngredientsService,
    private tagsService: TagsService,
    private countriesService: CountriesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { recipe: Recipe }
  ) {
    this.recipeId = data.recipe.id;
    
    this.recipeForm = this.fb.group({
      name: [data.recipe.name, Validators.required],
      prepTime: [data.recipe.prepTime, [Validators.required, Validators.min(0)]],
      cookTime: [data.recipe.cookTime, [Validators.required, Validators.min(0)]],
      countryOfOrigin: [data.recipe.countryOfOrigin || ''],
      wikiLink: [data.recipe.wikiLink || '', this.wikipediaUrlValidator],
      vegan: [data.recipe.vegan],
      vegetarian: [data.recipe.vegetarian],
      public: [data.recipe.public],
      tags: this.fb.array([]),
      ingredients: this.fb.array([]),
      // Instructions comes as object from backend
      instructions: [data.recipe.instructions, Validators.required]
    });

    // Populate tags
    data.recipe.tags.forEach(tag => {
      const index = this.tags.length;
      const tagControl = this.fb.control(tag);
      this.tags.push(tagControl);
      this.setupTagAutocomplete(index, tagControl);
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
      this.setupIngredientAutocomplete(index, ingredientGroup);
    });

    // When vegan is checked, automatically check vegetarian
    this.recipeForm.get('vegan')?.valueChanges.subscribe(isVegan => {
      if (isVegan) {
        this.recipeForm.patchValue({ vegetarian: true }, { emitEvent: false });
      }
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

  wikipediaUrlValidator(control: any): { [key: string]: any } | null {
    if (!control.value || control.value.trim() === '') {
      return null;
    }
    
    const url = control.value.trim();
    const wikiPattern = /^https?:\/\/(en\.)?wikipedia\.org\/wiki\/.+$/i;
    
    if (!wikiPattern.test(url)) {
      return { invalidWikipediaUrl: true };
    }
    
    return null;
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

  setupTagAutocomplete(index: number, tagControl: any): void {
    this.tagSuggestions[index] = tagControl.valueChanges.pipe(
      startWith(tagControl.value || ''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: any) => {
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          return of([]);
        }
        const searchValue = typeof value === 'string' ? value.trim() : '';
        return this.tagsService.listTags({
          name: { contains: searchValue },
          limit: 10
        });
      })
    );
  }

  setupIngredientAutocomplete(index: number, ingredientGroup: FormGroup): void {
    const ingredientNameControl = ingredientGroup.get('ingredientName');
    if (ingredientNameControl) {
      this.ingredientSuggestions[index] = ingredientNameControl.valueChanges.pipe(
        startWith(ingredientNameControl.value || ''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value: any) => {
          if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return of([]);
          }
          return this.ingredientsService.listIngredients({
            name: { contains: value.trim() },
            limit: 10
          });
        })
      );
    }
  }

  addTag(): void {
    const index = this.tags.length;
    const tagControl = this.fb.control('');
    this.tags.push(tagControl);
    this.setupTagAutocomplete(index, tagControl);
  }

  removeTag(index: number): void {
    this.tags.removeAt(index);
    this.tagSuggestions.splice(index, 1);
  }

  addIngredient(): void {
    const index = this.ingredients.length;
    const ingredientGroup = this.fb.group({
      ingredientName: [''],
      ingredientId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required],
      description: ['']
    });
    
    this.ingredients.push(ingredientGroup);
    this.setupIngredientAutocomplete(index, ingredientGroup);
  }

  removeIngredient(index: number): void {
    this.ingredients.removeAt(index);
    this.ingredientSuggestions.splice(index, 1);
  }

  onIngredientSelected(index: number, event: MatAutocompleteSelectedEvent): void {
    const ingredient = event.option.value as Ingredient;
    const ingredientGroup = this.ingredients.at(index) as FormGroup;
    ingredientGroup.patchValue({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name
    });
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
      vegetarian: formValue.vegetarian,
      vegan: formValue.vegan,
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
}
