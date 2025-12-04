import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-aliases-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './aliases-form.html',
})
export class AliasesFormComponent {
  @Input() aliases!: FormArray;

  constructor(private fb: FormBuilder) {}

  addAlias(): void {
    this.aliases.push(this.fb.control(''));
  }

  removeAlias(index: number): void {
    this.aliases.removeAt(index);
  }
}
