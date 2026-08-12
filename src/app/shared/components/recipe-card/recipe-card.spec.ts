import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Recipe } from '../../../core/recipes.service';
import { RecipeCardComponent } from './recipe-card';

describe('RecipeCardComponent', () => {
  let fixture: ComponentFixture<RecipeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeCardComponent);
    fixture.componentInstance.recipe = {
      id: 'recipe-id',
      name: 'Test Recipe',
      createdBy: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        admin: false,
        createdOn: '2026-01-01T00:00:00Z',
        updatedOn: '2026-01-01T00:00:00Z'
      },
      tags: [],
      ingredients: [],
      recipeIngredients: [],
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      public: true,
      instructions: {},
      instructionImages: [],
      createdOn: '2026-01-01T00:00:00Z',
      updatedOn: '2026-01-01T00:00:00Z'
    } satisfies Recipe;
    fixture.detectChanges();
  });

  it('renders the card as a link to the recipe', () => {
    const recipeLink = fixture.nativeElement.querySelector('.recipe-link') as HTMLAnchorElement;

    expect(recipeLink.getAttribute('href')).toBe('/recipes/recipe-id');
    expect(recipeLink.getAttribute('aria-label')).toBe('View recipe: Test Recipe');
  });
});
