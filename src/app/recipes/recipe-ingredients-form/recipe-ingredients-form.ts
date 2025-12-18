import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
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

  addIngredient(): void {
    const ingredientGroup = this.fb.group({
      ingredientName: [''],
      ingredientId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required],
      description: ['']
    });

    this.ingredients.push(ingredientGroup);
    this.setupAutocomplete(this.ingredients.length - 1);
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

  private setupAutocomplete(index: number): void {
    const ingredientGroup = this.ingredients.at(index) as FormGroup;
    const ingredientNameControl = ingredientGroup.get('ingredientName');

    if (ingredientNameControl) {
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
    }
  }

  getAsFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }
}
