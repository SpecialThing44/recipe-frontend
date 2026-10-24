import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CountriesService } from '../../core/countries.service';
import { RecipesService } from '../../core/recipes.service';
import { UsersService } from '../../core/users.service';
import { recipeFixture } from '../../shared/testing/recipe-fixture';
import { UserProfileComponent } from './user-profile';

describe('Profile recipe actions', () => {
  let component: UserProfileComponent;
  let recipesService: jasmine.SpyObj<RecipesService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    recipesService = jasmine.createSpyObj('RecipesService', ['saveRecipe', 'unsaveRecipe', 'deleteRecipe', 'listRecipes']);
    recipesService.saveRecipe.and.returnValue(of(undefined));
    recipesService.unsaveRecipe.and.returnValue(of(undefined));
    recipesService.deleteRecipe.and.returnValue(of(undefined));
    recipesService.listRecipes.and.returnValue(of([]));
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(recipeFixture) } as never);
    component = new UserProfileComponent({} as AuthService, {} as UsersService, recipesService,
      new CountriesService(), {} as ActivatedRoute, new FormBuilder(),
      jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']), dialog);
    component.currentUser = recipeFixture.createdBy;
    component.user = { ...recipeFixture.createdBy, id: 'another-user' };
  });

  it('saves and unsaves a recipe from another profile', () => {
    component.toggleSave(recipeFixture);
    expect(recipesService.saveRecipe).toHaveBeenCalledWith(recipeFixture.id);
    component.toggleSave(recipeFixture);
    expect(recipesService.unsaveRecipe).toHaveBeenCalledWith(recipeFixture.id);
  });

  it('refreshes recipes after editing', async () => {
    await component.editRecipe(recipeFixture);
    expect(recipesService.listRecipes).toHaveBeenCalledWith({ belongsToUser: 'another-user', limit: 10, page: 0 });
  });

  it('does not delete a recipe when confirmation is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteRecipe(recipeFixture);
    expect(recipesService.deleteRecipe).not.toHaveBeenCalled();
  });
});
