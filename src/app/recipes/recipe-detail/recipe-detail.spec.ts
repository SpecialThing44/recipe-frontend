import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
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

  it('scales whole sub-recipes by their quantity and servings by the recipe yield', () => {
    const entry = {
      component: { recipe: { id: 'component', name: 'Sauce' }, quantity: { unit: 'piece', amount: 2 } },
      recipe: { ...recipeFixture, servings: 4 }
    };
    component.scaleFactor = 1.5;
    expect(component.getFormattedSubRecipeScaledAmount(entry, 100, 'gram')).toBe('300');
    entry.component.quantity.unit = 'serving';
    expect(component.getFormattedSubRecipeScaledAmount(entry, 100, 'gram')).toBe('75');
  });

});

describe('Recipe detail image preview', () => {
  let fixture: import('@angular/core/testing').ComponentFixture<RecipeDetailComponent>;
  let dialog: MatDialog;
  const image = {
    thumbnail: '/test-thumbnail.jpg',
    medium: '/test-medium.jpg',
    large: '/test-large.jpg'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {
          paramMap: of(convertToParamMap({ id: recipeFixture.id }))
        } },
        { provide: RecipesService, useValue: {
          getRecipe: () => of({ ...recipeFixture, image }),
          listRecipes: () => of([])
        } },
        { provide: AuthService, useValue: { currentUser$: of(null) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RecipeDetailComponent);
    dialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
  });

  afterEach(() => dialog.closeAll());

  it('groups an image with all four recipe attributes', () => {
    const overview = fixture.nativeElement.querySelector('.recipe-overview');
    expect(overview.classList.contains('has-image')).toBeTrue();
    expect(overview.querySelectorAll('.info-card').length).toBe(4);
    expect(overview.querySelector('img').getAttribute('src')).toBe(image.large);
    expect(overview.querySelector('source').getAttribute('srcset')).toBe(image.medium);
  });

  it('opens a labelled full-size preview and closes it with the close button', () => {
    const button = fixture.nativeElement.querySelector('.recipe-image-section') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Zoom image of Vegetable Soup');
    button.click();
    fixture.detectChanges();
    expect(dialog.openDialogs.length).toBe(1);
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label'))
      .toBe('Vegetable Soup image preview');
    expect(document.querySelector('.image-preview img')?.getAttribute('src')).toBe(image.large);
    const preview = dialog.openDialogs[0];
    spyOn(preview, 'close').and.callThrough();
    (document.querySelector('[aria-label="Close image preview"]') as HTMLButtonElement).click();
    expect(preview.close).toHaveBeenCalled();
  });

  it('keeps the overview without an image in its existing layout', () => {
    fixture.componentInstance.recipe = { ...recipeFixture };
    fixture.detectChanges();
    const overview = fixture.nativeElement.querySelector('.recipe-overview');
    expect(overview.classList.contains('has-image')).toBeFalse();
    expect(overview.querySelector('.recipe-image-section')).toBeNull();
    expect(overview.querySelectorAll('.info-card').length).toBe(4);
  });
});
