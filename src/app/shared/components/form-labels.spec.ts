import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <mat-form-field appearance="fill">
      <mat-label>Recipe name</mat-label>
      <input matInput value="Soup" />
    </mat-form-field>
    <mat-form-field appearance="fill">
      <mat-label>Description</mat-label>
      <input matInput />
    </mat-form-field>
    <mat-form-field appearance="fill">
      <mat-label>Unit</mat-label>
      <mat-select value="piece"><mat-option value="piece">Piece</mat-option></mat-select>
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>Servings</mat-label>
      <input matInput value="2" />
    </mat-form-field>
  `,
})
class FormLabelsExample {}

describe('Form field labels', () => {
  let fixture: ComponentFixture<FormLabelsExample>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormLabelsExample] }).compileComponents();
    fixture = TestBed.createComponent(FormLabelsExample);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows labels on untouched empty and populated fields', () => {
    const labels = fixture.nativeElement.querySelectorAll('mat-label') as NodeListOf<HTMLElement>;
    expect(labels.length).toBe(4);
    labels.forEach((label) => expect(label.getBoundingClientRect().height).toBeGreaterThan(0));
  });

  it('keeps labels visible after inputs lose focus', () => {
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => {
      input.focus();
      fixture.detectChanges();
      input.blur();
      fixture.detectChanges();
    });
    const labels = fixture.nativeElement.querySelectorAll('mat-label') as NodeListOf<HTMLElement>;
    labels.forEach((label) => expect(label.getBoundingClientRect().height).toBeGreaterThan(0));
  });
});
