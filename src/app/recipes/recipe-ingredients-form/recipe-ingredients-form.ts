import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { IngredientsService, Ingredient } from '../../core/ingredients.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { availableUnits } from '../../shared/units/available-units';

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
    MatAutocompleteModule
  ],
  templateUrl: './recipe-ingredients-form.html',
  styleUrl: './recipe-ingredients-form.scss'
})
export class RecipeIngredientsFormComponent implements OnInit {
  @Input() ingredients!: FormArray;

  ingredientSuggestions: Observable<Ingredient[]>[] = [];
  readonly availableUnits = availableUnits;

  constructor(
    private fb: FormBuilder,
    private ingredientsService: IngredientsService
  ) {}

  ngOnInit(): void {
    // Initialize suggestions for existing controls
    this.ingredients.controls.forEach((control, index) => {
      this.setupAutocomplete(index);
    });
  }

  addIngredient(index: number = -1): void {
    const ingredientGroup = this.fb.group({
      ingredientName: ['', Validators.required],
      ingredientId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required],
      description: ['']
    });

    if (index === -1) {
      this.ingredients.push(ingredientGroup);
      this.setupAutocomplete(this.ingredients.length - 1);
    } else {
      this.ingredients.insert(index + 1, ingredientGroup);
      this.ingredientSuggestions.splice(index + 1, 0, of([]));
      this.setupAutocomplete(index + 1);
    }
  }

  removeIngredient(index: number): void {
    this.ingredients.removeAt(index);
    this.ingredientSuggestions.splice(index, 1);
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
    const ingredient = event.option.value as Ingredient;
    const ingredientGroup = this.ingredients.at(index) as FormGroup;
    
    // Set ID first
    ingredientGroup.patchValue({
      ingredientId: ingredient.id
    });
    
    // Set name without emitting event to prevent clearing the ID in the valueChanges subscription
    const nameControl = ingredientGroup.get('ingredientName');
    nameControl?.setValue(ingredient.name, { emitEvent: false });
    // Clear any errors (like requireMatch) now that we have a valid selection
    nameControl?.setErrors(null);
  }

  private setupAutocomplete(index: number): void {
    const ingredientGroup = this.ingredients.at(index) as FormGroup;
    const ingredientNameControl = ingredientGroup.get('ingredientName');
    const ingredientIdControl = ingredientGroup.get('ingredientId');

    if (ingredientNameControl && ingredientIdControl) {
      this.ingredientSuggestions[index] = ingredientNameControl.valueChanges.pipe(
        startWith(ingredientNameControl.value || ''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return of([]);
          }
          return this.ingredientsService.listIngredients({
            name: { contains: value.trim() },
            limit: 10
          });
        })
      );

      // Invalidate selection when user types
      ingredientNameControl.valueChanges.subscribe(value => {
        ingredientIdControl.setValue(null);
        if (value && typeof value === 'string' && value.trim().length > 0) {
          ingredientNameControl.setErrors({ requireMatch: true });
        }
      });
    }
  }

  getAsFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }
}
