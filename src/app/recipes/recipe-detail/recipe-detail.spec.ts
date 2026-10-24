import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { AuthService, User } from '../../core/auth.service';
import { Recipe, RecipesService } from '../../core/recipes.service';
import { recipeFixture } from '../../shared/testing/recipe-fixture';
import { RecipeDetailComponent } from './recipe-detail';

describe('RecipeDetailComponent', () => {
  let component: RecipeDetailComponent;
  let recipesService: jasmine.SpyObj<RecipesService>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let currentUser: BehaviorSubject<User | null>;

  beforeEach(() => {
    recipesService = jasmine.createSpyObj('RecipesService', ['getRecipe', 'listRecipes']);
    recipesService.getRecipe.and.returnValue(of(recipeFixture));
    recipesService.listRecipes.and.returnValue(of([]));
    params = new BehaviorSubject(convertToParamMap({ id: recipeFixture.id }));
    currentUser = new BehaviorSubject<User | null>(null);
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new RecipeDetailComponent(
      { paramMap: params, snapshot: { paramMap: params.value } } as unknown as ActivatedRoute,
      {} as Router, recipesService, { currentUser$: currentUser } as unknown as AuthService,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open']),
      jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])
    ));
  });

  it('keeps the latest recipe when route requests finish out of order', () => {
    const olderResponse = new Subject<Recipe>();
    const newerResponse = new Subject<Recipe>();
    recipesService.getRecipe.and.returnValues(olderResponse, newerResponse);
    component.ngOnInit();
    params.next(convertToParamMap({ id: 'new-recipe' }));
    newerResponse.next({ ...recipeFixture, id: 'new-recipe' });
    olderResponse.next(recipeFixture);
    expect(component.recipe?.id).toBe('new-recipe');
  });

  it('releases authentication subscriptions on destruction', () => {
    component.ngOnInit();
    recipesService.listRecipes.calls.reset();
    TestBed.resetTestingModule();
    currentUser.next(recipeFixture.createdBy);
    expect(recipesService.listRecipes).not.toHaveBeenCalled();
  });
  it('checks the current recipe by ID rather than scanning the first 100 saved recipes', () => {
    currentUser.next(recipeFixture.createdBy);
    recipesService.listRecipes.and.callFake(filters => of(filters?.savedByUser ? [recipeFixture] : []));
    component.ngOnInit();
    expect(component.isSaved).toBeTrue();
    expect(recipesService.listRecipes).toHaveBeenCalledWith({
      ids: [recipeFixture.id], savedByUser: 'user-id', limit: 1
    });
    expect(recipesService.listRecipes.calls.allArgs().some(([filters]) => filters?.limit === 100)).toBeFalse();
  });

});
