import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { RecipesService } from '../core/recipes.service';
import { recipeFixture } from '../shared/testing/recipe-fixture';
import { DashboardComponent } from './dashboard';

describe('Dashboard recipe changes', () => {
  for (const action of ['create', 'edit']) {
    it(`refreshes each section after ${action} succeeds`, () => {
      const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
      dialog.open.and.returnValue({ afterClosed: () => of(recipeFixture) } as never);
      const recipesService = jasmine.createSpyObj<RecipesService>('RecipesService', ['listRecipes']);
      recipesService.listRecipes.and.returnValue(of([]));
      const component = TestBed.runInInjectionContext(() => new DashboardComponent({} as AuthService, recipesService, dialog));
      component.currentUser = recipeFixture.createdBy;

      if (action === 'create') component.createRecipe();
      else component.editRecipe(recipeFixture);

      expect(recipesService.listRecipes).toHaveBeenCalledTimes(3);
    });
  }
});
