import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { AuthService, User } from '../../core/auth.service';
import { RecipesService } from '../../core/recipes.service';
import { IngredientsService } from '../../core/ingredients.service';
import { TagsService } from '../../core/tags.service';
import { RoutePrefetchService } from '../../core/route-prefetch.service';
import { recipeFixture } from '../../shared/testing/recipe-fixture';
import { RecipesListComponent } from './recipes-list';

describe('RecipesListComponent', () => {
  let component: RecipesListComponent;
  let recipesService: jasmine.SpyObj<RecipesService>;
  let currentUser: BehaviorSubject<User | null>;
  let authLoading: BehaviorSubject<boolean>;
  let queryParams: BehaviorSubject<Params>;

  beforeEach(() => {
    recipesService = jasmine.createSpyObj('RecipesService', ['listRecipes']);
    recipesService.listRecipes.and.returnValue(of([]));
    currentUser = new BehaviorSubject<User | null>(null);
    authLoading = new BehaviorSubject(false);
    queryParams = new BehaviorSubject<Params>({});
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new RecipesListComponent(
      recipesService,
      jasmine.createSpyObj<IngredientsService>('IngredientsService', ['listIngredients']),
      jasmine.createSpyObj<TagsService>('TagsService', ['listTags']),
      new FormBuilder(), { queryParams } as unknown as ActivatedRoute,
      { currentUser$: currentUser, loading$: authLoading } as unknown as AuthService,
      jasmine.createSpyObj<RoutePrefetchService>('RoutePrefetchService', ['scheduleIdlePrefetch']),
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open']),
      jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])
    ));
  });

  it('waits for the profile before requesting My Recipes', () => {
    authLoading.next(true);
    queryParams.next({ myRecipes: 'true' });
    component.ngOnInit();
    expect(recipesService.listRecipes).not.toHaveBeenCalled();
    currentUser.next(recipeFixture.createdBy);
    authLoading.next(false);
    expect(recipesService.listRecipes).toHaveBeenCalledOnceWith({
      belongsToUser: 'user-id', limit: 25, page: 0
    });
  });

  it('reloads saved recipes when authentication becomes available', () => {
    queryParams.next({ savedRecipes: 'true' });
    component.ngOnInit();
    recipesService.listRecipes.calls.reset();
    currentUser.next(recipeFixture.createdBy);
    expect(recipesService.listRecipes).toHaveBeenCalledOnceWith({
      savedByUser: 'user-id', limit: 25, page: 0
    });
  });
  it('ignores an older response after filters change', () => {
    const olderResponse = new Subject<typeof recipeFixture[]>();
    const newerResponse = new Subject<typeof recipeFixture[]>();
    recipesService.listRecipes.and.returnValues(olderResponse, newerResponse);
    component.ngOnInit();
    component.filterForm.patchValue({ nameValue: 'new' });
    component.applyFilters();
    newerResponse.next([{ ...recipeFixture, name: 'New result' }]);
    olderResponse.next([recipeFixture]);
    expect(component.recipes.map(recipe => recipe.name)).toEqual(['New result']);
  });

  it('stops requesting recipes when the component is destroyed', () => {
    component.ngOnInit();
    recipesService.listRecipes.calls.reset();
    TestBed.resetTestingModule();
    currentUser.next(recipeFixture.createdBy);
    expect(recipesService.listRecipes).not.toHaveBeenCalled();
  });

});
