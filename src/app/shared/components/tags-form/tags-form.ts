import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TagsService } from '../../../core/tags.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';

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
export class TagsFormComponent implements OnInit {
  @Input() tags!: FormArray;
  @Input() placeholder: string = 'e.g., dessert, quick';

  tagSuggestions: Observable<string[]>[] = [];

  constructor(
    private fb: FormBuilder,
    private tagsService: TagsService
  ) {}

  ngOnInit(): void {
    // Initialize suggestions for existing controls
    this.tags.controls.forEach((control, index) => {
      this.setupAutocomplete(index, control as FormControl);
    });
  }

  addTag(): void {
    const index = this.tags.length;
    const tagControl = this.fb.control('');
    this.tags.push(tagControl);
    this.setupAutocomplete(index, tagControl);
  }

  removeTag(index: number): void {
    this.tags.removeAt(index);
    this.tagSuggestions.splice(index, 1);
  }

  private setupAutocomplete(index: number, control: FormControl): void {
    this.tagSuggestions[index] = control.valueChanges.pipe(
      startWith(control.value || ''),
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

  getAsFormControl(control: any): FormControl {
    return control as FormControl;
  }
}
