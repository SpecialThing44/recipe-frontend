import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Quill from 'quill';
import { RecipesService, Recipe } from '../../core/recipes.service';
import { AuthService } from '../../core/auth.service';
import { RecipeEditDialogComponent } from '../recipe-edit-dialog/recipe-edit-dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss',
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  loading = false;
  error: string | null = null;
  canEdit$!: Observable<boolean>;
  instructionsContent: SafeHtml | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipesService: RecipesService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const recipeId = this.route.snapshot.paramMap.get('id');
    if (recipeId) {
      this.loadRecipe(recipeId);
    } else {
      this.error = 'No recipe ID provided';
    }

    this.canEdit$ = this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !this.recipe) return false;
        return user.id === this.recipe.createdBy.id;
      })
    );
  }

  loadRecipe(id?: string): void {
    const recipeId = id || this.route.snapshot.paramMap.get('id');
    if (!recipeId) return;

    this.loading = true;
    this.error = null;

    this.recipesService.getRecipe(recipeId).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        // Instructions come from backend as object, convert to HTML using Quill
        try {
          const tempQuill = new Quill(document.createElement('div'));
          // Instructions is already an object, not a JSON string
          const delta = typeof recipe.instructions === 'string' 
            ? JSON.parse(recipe.instructions) 
            : recipe.instructions;
          tempQuill.setContents(delta);
          const html = tempQuill.root.innerHTML;
          this.instructionsContent = this.sanitizer.bypassSecurityTrustHtml(html);
        } catch (e) {
          console.error('Error parsing instructions:', e);
          // Fallback to plain text
          const fallbackText = typeof recipe.instructions === 'string' 
            ? recipe.instructions 
            : JSON.stringify(recipe.instructions);
          this.instructionsContent = this.sanitizer.bypassSecurityTrustHtml(
            `<p>${fallbackText}</p>`
          );
        }
        this.loading = false;

        // Re-evaluate canEdit$ after recipe is loaded
        this.canEdit$ = this.authService.currentUser$.pipe(
          map(user => {
            if (!user || !this.recipe) return false;
            return user.id === this.recipe.createdBy.id;
          })
        );
      },
      error: (err) => {
        console.error('Error loading recipe:', err);
        this.error = err.message || 'Failed to load recipe';
        this.loading = false;
      }
    });
  }

  openEditDialog(): void {
    if (!this.recipe) return;

    const dialogRef = this.dialog.open(RecipeEditDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      data: { recipe: this.recipe }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadRecipe();
    });
  }

  deleteRecipe(): void {
    if (!this.recipe) return;

    if (!confirm(`Are you sure you want to delete "${this.recipe.name}"?`)) {
      return;
    }

    this.recipesService.deleteRecipe(this.recipe.id).subscribe({
      next: () => {
        this.snackBar.open('Recipe deleted successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/recipes']);
      },
      error: (err) => {
        console.error('Error deleting recipe:', err);
        this.snackBar.open('Failed to delete recipe', 'Close', { duration: 3000 });
      }
    });
  }

  getUnitName(unit: any): string {
    // Handle both string format and enum object format
    if (typeof unit === 'string') {
      return unit;
    }
    return unit?.name || 'piece';
  }
}
