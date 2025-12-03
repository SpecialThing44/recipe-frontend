import { Routes } from '@angular/router';
import {RecipesListComponent} from './recipes/recipes-list/recipes-list';
import {RecipeDetailComponent} from './recipes/recipe-detail/recipe-detail';
import {IngredientsListComponent} from './ingredients/ingredients-list/ingredients-list';
import {UsersListComponent} from './users/users-list/users-list';
import {UserProfileComponent} from './users/user-profile/user-profile';
import {LoginComponent} from './auth/login/login';
import {SignupComponent} from './auth/signup/signup';

export const routes: Routes = [
  { path: '', redirectTo: 'recipes', pathMatch: 'full' },
  { path: 'recipes', component: RecipesListComponent },
  { path: 'recipes/:id', component: RecipeDetailComponent },
  { path: 'ingredients', component: IngredientsListComponent },
  { path: 'users', component: UsersListComponent },
  { path: 'users/:id', component: UserProfileComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent }
];
