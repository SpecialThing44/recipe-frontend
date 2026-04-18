import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipes/recipes-list/recipes-list').then(m => m.RecipesListComponent)
  },
  {
    path: 'recipes/:id',
    loadComponent: () => import('./recipes/recipe-detail/recipe-detail').then(m => m.RecipeDetailComponent)
  },
  {
    path: 'ingredients',
    loadComponent: () => import('./ingredients/ingredients-list/ingredients-list').then(m => m.IngredientsListComponent)
  },
  {
    path: 'admin/ingredient-weights',
    loadComponent: () => import('./admin/admin-ingredient-weights/admin-ingredient-weights').then(m => m.AdminIngredientWeightsComponent)
  },
  {
    path: 'admin/ingredient-weights/settings',
    loadComponent: () => import('./admin/admin-ingredient-weight-settings/admin-ingredient-weight-settings').then(m => m.AdminIngredientWeightSettingsComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./users/users-list/users-list').then(m => m.UsersListComponent)
  },
  {
    path: 'users/:id',
    loadComponent: () => import('./users/user-profile/user-profile').then(m => m.UserProfileComponent)
  },
  {
    path: 'callback',
    loadComponent: () => import('./callback/callback.component').then(m => m.CallbackComponent)
  },
  { path: 'unauthorized', redirectTo: 'recipes' },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then(m => m.NotFoundComponent)
  }
];
