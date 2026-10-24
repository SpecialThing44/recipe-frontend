import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TagsService } from '../../../core/tags.service';
import { Observable, of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-tags-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule
  ],
  templateUrl: './tags-form.html',
})
export class TagsFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private formArray!: FormArray;
  private formChanges?: Subscription;
  private suggestionControls: AbstractControl[] = [];

  @Input() set tags(controls: FormArray) {
    this.formChanges?.unsubscribe();
    this.formArray = controls;
    this.ensureAutocompleteInitialized();
    this.formChanges = controls.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ensureAutocompleteInitialized());
  }

  get tags(): FormArray {
    return this.formArray;
  }
  @Input() placeholder: string = 'e.g., dessert, quick';

  tagSuggestions: Observable<string[]>[] = [];
  private readonly autocompleteByControl = new WeakMap<AbstractControl, Observable<string[]>>();

  constructor(
    private fb: FormBuilder,
    private tagsService: TagsService
  ) {}

  addTag(): void {
    const tagControl = this.fb.control('');
    this.tags.push(tagControl);
    this.ensureAutocompleteInitialized();
  }

  removeTag(index: number): void {
    this.tags.removeAt(index);
  }

  private setupAutocomplete(control: FormControl): Observable<string[]> {
    return control.valueChanges.pipe(
      startWith(control.value || ''),
      debounceTime(100),
      distinctUntilChanged(),
      switchMap((value: any) => {
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          return of([]);
        }
        const searchValue = typeof value === 'string' ? value.trim() : '';
        return this.tagsService.listTags({
          name: { contains: searchValue },
          limit: 10
        }).pipe(catchError(() => of([])));
      })
    );
  }

  private ensureAutocompleteInitialized(): void {
    if (!this.tags) {
      return;
    }

    const controls = this.tags.controls;
    if (controls.length === this.suggestionControls.length &&
        controls.every((control, index) => control === this.suggestionControls[index])) return;
    this.suggestionControls = [...controls];
    this.tagSuggestions = controls.map((control) => {
      const existing = this.autocompleteByControl.get(control);
      if (existing) {
        return existing;
      }

      const created = this.setupAutocomplete(control as FormControl);
      this.autocompleteByControl.set(control, created);
      return created;
    });
  }

  getAsFormControl(control: any): FormControl {
    return control as FormControl;
  }
}
