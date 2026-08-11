import { Component, Input, OnInit, DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { IngredientsService, Ingredient } from '../../core/ingredients.service';
import { Recipe, RecipesService } from '../../core/recipes.service';
import { combineLatest, Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { availableRecipeUnits, availableUnits } from '../../shared/units/available-units';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-recipe-ingredients-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    DragDropModule,
    MatAutocompleteModule,
    MatDialogModule
  ],
  templateUrl: './recipe-ingredients-form.html',
  styleUrl: './recipe-ingredients-form.scss'
})
export class RecipeIngredientsFormComponent implements OnInit {
  @Input() ingredients!: FormArray;
  @Input() currentRecipeId?: string;

  ingredientSuggestions: Observable<Array<Ingredient | Recipe>>[] = [];
  readonly availableUnits = availableUnits;
  readonly minimumQuantity = Number.EPSILON;
  private readonly autocompleteByControl = new WeakMap<AbstractControl, Observable<Array<Ingredient | Recipe>>>();
  private readonly invalidateSelectionBound = new WeakSet<AbstractControl>();

  constructor(
    private fb: FormBuilder,
    private ingredientsService: IngredientsService,
    private recipesService: RecipesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.ensureAutocompleteInitialized();
  }

  ngDoCheck(): void {
    this.ensureAutocompleteInitialized();
  }

  addIngredient(index: number = -1): void {
    const ingredientGroup = this.fb.group({
      kind: ['ingredient', Validators.required],
      ingredientName: ['', Validators.required],
      ingredientId: ['', Validators.required],
      recipeId: [''],
      amount: [0, [Validators.required, Validators.min(Number.EPSILON)]],
      unit: ['', Validators.required],
      description: ['']
    });

    if (index === -1) {
      this.ingredients.push(ingredientGroup);
      this.ensureAutocompleteInitialized();
    } else {
      this.ingredients.insert(index + 1, ingredientGroup);
      this.ingredientSuggestions.splice(index + 1, 0, of([]));
      this.ensureAutocompleteInitialized();
    }
  }

  toggleKind(index: number): void {
    const group = this.ingredients.at(index) as FormGroup;
    const recipeSelected = group.get('kind')?.value === 'recipe';
    group.patchValue({
      kind: recipeSelected ? 'ingredient' : 'recipe',
      ingredientName: '',
      ingredientId: '',
      recipeId: '',
      unit: recipeSelected ? 'piece' : 'serving'
    });
    this.updateSelectionValidators(group);
  }

  unitsFor(group: FormGroup): typeof availableUnits {
    return group.get('kind')?.value === 'recipe' ? availableRecipeUnits : availableUnits;
  }

  removeIngredient(index: number): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Remove Ingredient',
        message: 'Are you sure you want to remove this ingredient?',
        confirmText: 'Remove'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ingredients.removeAt(index);
        this.ingredientSuggestions.splice(index, 1);
      }
    });
  }
drop(event: CdkDragDrop<string[]>) {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    
    if (previousIndex === currentIndex) {
      return;
    }

    const dir = this.ingredients.at(previousIndex);
    this.ingredients.removeAt(previousIndex);
    this.ingredients.insert(currentIndex, dir);

    const suggestion = this.ingredientSuggestions[previousIndex];
    this.ingredientSuggestions.splice(previousIndex, 1);
    this.ingredientSuggestions.splice(currentIndex, 0, suggestion);
    
    // Re-setup autocompletes if necessary, typically valueChanges subscriptions persist with the control,
    // but the index passed to setupAutocomplete closure might be stale if I used index in closure.
    // Looking at setupAutocomplete:
    // this.ingredientSuggestions[index] = ... 
    // It updates the array at index. I just moved the array elements around.
    // The subscription is on the control. 
    // The issue is if setupAutocomplete uses 'index' inside the pipe?
    // Let's check setupAutocomplete.
  }

  
  onIngredientSelected(index: number, event: MatAutocompleteSelectedEvent): void {
    const selected = event.option.value as Ingredient | Recipe;
    const ingredientGroup = this.ingredients.at(index) as FormGroup;
    const recipeSelected = ingredientGroup.get('kind')?.value === 'recipe';
    ingredientGroup.patchValue(recipeSelected
      ? { recipeId: selected.id, ingredientId: '' }
      : { ingredientId: selected.id, recipeId: '' });
    
    // Set name without emitting event to prevent clearing the ID in the valueChanges subscription
    const nameControl = ingredientGroup.get('ingredientName');
    nameControl?.setValue(selected.name, { emitEvent: false });
    // Clear any errors (like requireMatch) now that we have a valid selection
    nameControl?.setErrors(null);
  }

  private setupAutocomplete(ingredientGroup: FormGroup): Observable<Array<Ingredient | Recipe>> {
    const ingredientNameControl = ingredientGroup.get('ingredientName');
    const ingredientIdControl = ingredientGroup.get('ingredientId');

    const recipeIdControl = ingredientGroup.get('recipeId');
    const kindControl = ingredientGroup.get('kind');

    if (ingredientNameControl && ingredientIdControl && recipeIdControl && kindControl) {
      this.updateSelectionValidators(ingredientGroup);
      const suggestions = combineLatest([
        ingredientNameControl.valueChanges.pipe(startWith(ingredientNameControl.value || '')),
        kindControl.valueChanges.pipe(startWith(kindControl.value || 'ingredient'))
      ]).pipe(
        debounceTime(100),
        distinctUntilChanged(([leftName, leftKind], [rightName, rightKind]) => leftName === rightName && leftKind === rightKind),
        switchMap(([value, kind]) => {
          if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return of([]);
          }
          if (kind === 'recipe') {
            return this.recipesService.listRecipes({ name: { contains: value.trim() }, limit: 10 }).pipe(
              switchMap(recipes => of(recipes.filter(recipe => recipe.id !== this.currentRecipeId)))
            );
          }
          return this.ingredientsService.listIngredients({ aliasesOrName: [value.trim()], limit: 10 });
        })
      );

      if (!this.invalidateSelectionBound.has(ingredientNameControl)) {
        // Invalidate selection when user types
        ingredientNameControl.valueChanges.subscribe(value => {
          ingredientIdControl.setValue('');
          recipeIdControl.setValue('');
          if (value && typeof value === 'string' && value.trim().length > 0) {
            ingredientNameControl.setErrors({ requireMatch: true });
          }
        });
        this.invalidateSelectionBound.add(ingredientNameControl);
      }

      return suggestions;
    }

    return of([]);
  }

  private updateSelectionValidators(group: FormGroup): void {
    const recipeSelected = group.get('kind')?.value === 'recipe';
    const ingredientId = group.get('ingredientId');
    const recipeId = group.get('recipeId');
    ingredientId?.setValidators(recipeSelected ? [] : [Validators.required]);
    recipeId?.setValidators(recipeSelected ? [Validators.required] : []);
    ingredientId?.updateValueAndValidity({ emitEvent: false });
    recipeId?.updateValueAndValidity({ emitEvent: false });
  }

  private ensureAutocompleteInitialized(): void {
    if (!this.ingredients) {
      return;
    }

    this.ingredientSuggestions = this.ingredients.controls.map((control) => {
      const existing = this.autocompleteByControl.get(control);
      if (existing) {
        return existing;
      }

      const created = this.setupAutocomplete(control as FormGroup);
      this.autocompleteByControl.set(control, created);
      return created;
    });
  }

  getAsFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }
}
