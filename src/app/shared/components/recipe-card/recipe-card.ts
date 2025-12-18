import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Recipe } from '../../../core/recipes.service';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule, MatTooltipModule],
  templateUrl: './recipe-card.html',
  styleUrl: './recipe-card.scss'
})
export class RecipeCardComponent {
  @Input() recipe!: Recipe;
  @Input() layout: 'grid' | 'scroll' = 'grid';
  @Input() canEdit: boolean = false;
  @Input() isSaved: boolean = false;
  @Input() isLoggedIn: boolean = false;
  
  @Output() cardClick = new EventEmitter<string>();
  @Output() saveClick = new EventEmitter<Recipe>();
  @Output() editClick = new EventEmitter<Recipe>();
  @Output() deleteClick = new EventEmitter<Recipe>();

  onCardClick(): void {
    this.cardClick.emit(this.recipe.id);
  }

  onSaveClick(event: Event): void {
    event.stopPropagation();
    this.saveClick.emit(this.recipe);
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    this.editClick.emit(this.recipe);
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.deleteClick.emit(this.recipe);
  }
}
