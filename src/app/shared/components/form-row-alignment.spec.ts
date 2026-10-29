import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { IngredientsService } from '../../core/ingredients.service';
import { RecipesService } from '../../core/recipes.service';
import { TagsService } from '../../core/tags.service';
import { RecipeIngredientsFormComponent } from '../../recipes/recipe-ingredients-form/recipe-ingredients-form';
import { AliasesFormComponent } from './aliases-form/aliases-form';
import { TagsFormComponent } from './tags-form/tags-form';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TagsFormComponent, AliasesFormComponent, RecipeIngredientsFormComponent],
  styles: [':host { display: block; box-sizing: border-box; padding: 12px; }'],
  template: `
    <app-tags-form [tags]="tags" />
    <app-aliases-form [aliases]="aliases" />
    <app-recipe-ingredients-form [ingredients]="ingredients" />
  `,
})
class FormRowsExample {
  readonly tags = new FormArray([new FormControl('dinner')]);
  readonly aliases = new FormArray([new FormControl('lemon')]);
  readonly ingredients = new FormArray([
    new FormBuilder().group({
      kind: ['ingredient'],
      ingredientName: ['Lemon', Validators.required],
      ingredientId: ['lemon-id'],
      recipeId: [''],
      amount: [1, [Validators.required, Validators.min(Number.EPSILON)]],
      unit: ['piece', Validators.required],
      description: ['Juiced'],
    }),
  ]);
}

function verticalCenter(element: Element): number {
  const rectangle = element.getBoundingClientRect();
  return rectangle.top + rectangle.height / 2;
}

describe('Form row alignment', () => {
  let fixture: ComponentFixture<FormRowsExample>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormRowsExample],
      providers: [
        { provide: TagsService, useValue: { listTags: () => of([]) } },
        { provide: IngredientsService, useValue: { listIngredients: () => of([]) } },
        { provide: RecipesService, useValue: { listRecipes: () => of([]) } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormRowsExample);
    element = fixture.nativeElement;
    element.style.width = '900px';
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('centers tag and alias removal buttons beside their fields', () => {
    element.querySelectorAll('.row').forEach((row) => {
      const field = row.querySelector('.mat-mdc-text-field-wrapper')!;
      const button = row.querySelector('button')!;
      expect(Math.abs(verticalCenter(field) - verticalCenter(button))).toBeLessThan(1);
    });
  });

  it('aligns ingredient fields, drag handles, and actions on a single control row', () => {
    const row = element.querySelector('.ingredient-row')!;
    const fields = Array.from(row.querySelectorAll('.mat-mdc-text-field-wrapper'));
    const fieldTop = fields[0].getBoundingClientRect().top;
    fields.forEach((field) =>
      expect(Math.abs(field.getBoundingClientRect().top - fieldTop)).toBeLessThan(1),
    );
    row
      .querySelectorAll('.ingredient-controls button, .drag-handle, .action-buttons')
      .forEach((control) => {
        expect(Math.abs(verticalCenter(fields[0]) - verticalCenter(control))).toBeLessThan(1);
      });
  });

  it('keeps the controls aligned when validation messages are displayed', async () => {
    fixture.componentInstance.ingredients.at(0).get('amount')!.setValue(-1);
    fixture.componentInstance.ingredients.markAllAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.textContent).toContain('Must be positive');
    const fields = Array.from(
      element.querySelectorAll('.ingredient-row .mat-mdc-text-field-wrapper'),
    );
    fields.forEach((field) =>
      expect(Math.abs(verticalCenter(field) - verticalCenter(fields[0]))).toBeLessThan(1),
    );
    const row = element.querySelector('.ingredient-row')!;
    const field = row.querySelector('.mat-mdc-text-field-wrapper')!;
    row
      .querySelectorAll('.ingredient-controls button, .drag-handle, .action-buttons')
      .forEach((control) => {
        expect(Math.abs(verticalCenter(field) - verticalCenter(control))).toBeLessThan(1);
      });
  });

  it('stacks ingredient actions and centers the field row inside its box', () => {
    const row = element.querySelector('.ingredient-row')!;
    const field = row.querySelector('.mat-mdc-text-field-wrapper')!;
    const buttons = row.querySelectorAll('.action-buttons button');
    const first = buttons[0].getBoundingClientRect();
    const second = buttons[1].getBoundingClientRect();
    expect(Math.abs(first.left - second.left)).toBeLessThan(1);
    expect(second.top).toBeGreaterThanOrEqual(first.bottom);
    buttons.forEach((button) => {
      const icon = button.querySelector('mat-icon')!;
      expect(Math.abs(verticalCenter(icon) - verticalCenter(button))).toBeLessThan(1);
    });
    expect(Math.abs(verticalCenter(field) - verticalCenter(row))).toBeLessThan(1);
  });

  it('keeps amount and unit fields aligned within a narrow form', async () => {
    element.style.width = '360px';
    fixture.detectChanges();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const row = element.querySelector('.ingredient-row')!;
    const amount = row.querySelector('.amount-field')!.getBoundingClientRect();
    const unit = row.querySelector('.unit-field')!.getBoundingClientRect();
    expect(Math.abs(amount.top - unit.top)).toBeLessThan(1);
    row
      .querySelectorAll('mat-form-field, .ingredient-controls, .action-buttons')
      .forEach((control) => {
        expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(
          row.getBoundingClientRect().right,
        );
      });
  });
});
