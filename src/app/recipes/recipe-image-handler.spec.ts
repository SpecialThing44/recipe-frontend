import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { CountriesService } from '../core/countries.service';
import { RecipesService } from '../core/recipes.service';
import { recipeFixture } from '../shared/testing/recipe-fixture';
import { RecipeCreateDialogComponent } from './recipe-create-dialog/recipe-create-dialog';
import { RecipeEditDialogComponent } from './recipe-edit-dialog/recipe-edit-dialog';

describe('Recipe instruction image handlers', () => {
  for (const mode of ['create', 'edit']) {
    it(`uploads an instruction image from the ${mode} toolbar`, () => {
      const recipesService = jasmine.createSpyObj<RecipesService>('RecipesService', ['checkAiHealth', 'uploadInstructionImage']);
      recipesService.checkAiHealth.and.returnValue(of(false));
      recipesService.uploadInstructionImage.and.returnValue(of({ url: '/image.png' }));
      const argumentsForDialog = [new FormBuilder(), recipesService, new CountriesService(),
        jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']),
        jasmine.createSpyObj('MatDialogRef', ['close'])] as const;
      const component = mode === 'create'
        ? new RecipeCreateDialogComponent(...argumentsForDialog)
        : new RecipeEditDialogComponent(...argumentsForDialog, { recipe: recipeFixture });
      if (component instanceof RecipeCreateDialogComponent) component.createdRecipeId = recipeFixture.id;
      component.quillEditor = jasmine.createSpyObj('editor', ['getSelection', 'insertEmbed', 'setSelection']);
      component.quillEditor.getSelection.and.returnValue({ index: 3 });
      const input = document.createElement('input');
      const file = new File(['image'], 'image.png', { type: 'image/png' });
      Object.defineProperty(input, 'files', { value: [file] });
      spyOn(input, 'click');
      spyOn(document, 'createElement').and.returnValue(input);
      const modules = component.quillModules as { toolbar: { handlers: { image: () => void } } };

      modules.toolbar.handlers.image();
      input.dispatchEvent(new Event('change'));

      expect(recipesService.uploadInstructionImage).toHaveBeenCalledWith(recipeFixture.id, file);
      expect(component.quillEditor.insertEmbed).toHaveBeenCalledWith(3, 'image', '/image.png');
    });
  }
});
