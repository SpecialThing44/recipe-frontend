import { Routes } from '@angular/router';
import {RecipesListComponent} from './recipes/recipes-list/recipes-list';
import {RecipeDetailComponent} from './recipes/recipe-detail/recipe-detail';
import {IngredientsListComponent} from './ingredients/ingredients-list/ingredients-list';
import {UsersListComponent} from './users/users-list/users-list';
import {UserProfileComponent} from './users/user-profile/user-profile';
import {CallbackComponent} from './callback/callback.component';
import {NotFoundComponent} from './not-found/not-found';
import {DashboardComponent} from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'recipes', component: RecipesListComponent },
  { path: 'recipes/:id', component: RecipeDetailComponent },
  { path: 'ingredients', component: IngredientsListComponent },
  { path: 'users', component: UsersListComponent },
  { path: 'users/:id', component: UserProfileComponent },
  { path: 'callback', component: CallbackComponent },
  { path: 'unauthorized', redirectTo: 'recipes' },
  { path: '**', component: NotFoundComponent }
];
