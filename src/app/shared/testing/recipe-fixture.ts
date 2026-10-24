import { Recipe } from '../../core/recipes.service';

export const recipeFixture: Recipe = {
  id: 'recipe-id',
  name: 'Vegetable Soup',
  createdBy: {
    id: 'user-id', name: 'Test Cook', email: 'cook@example.com', admin: false,
    createdOn: '2026-01-01T00:00:00Z', updatedOn: '2026-01-01T00:00:00Z'
  },
  tags: ['soup'], ingredients: [], recipeIngredients: [], prepTime: 10, cookTime: 20,
  servings: 4, public: true, instructions: { ops: [{ insert: 'Cook\n' }] },
  instructionImages: [], createdOn: '2026-01-01T00:00:00Z', updatedOn: '2026-01-01T00:00:00Z'
};
