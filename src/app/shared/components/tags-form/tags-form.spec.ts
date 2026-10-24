import { TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import { TagsService } from '../../../core/tags.service';
import { TagsFormComponent } from './tags-form';

describe('TagsFormComponent', () => {
  let component: TagsFormComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new TagsFormComponent(new FormBuilder(),
      jasmine.createSpyObj<TagsService>('TagsService', ['listTags'])));
    component.tags = new FormArray([new FormControl('soup')]);
  });

  it('keeps the same suggestion array while editing a tag', () => {
    const suggestions = component.tagSuggestions;
    component.tags.at(0).setValue('dinner');
    expect(component.tagSuggestions).toBe(suggestions);
  });

  it('preserves suggestion streams when another tag is removed', () => {
    component.tags.push(new FormControl('bread'));
    const secondSuggestions = component.tagSuggestions[1];
    component.removeTag(0);
    expect(component.tagSuggestions.length).toBe(1);
    expect(component.tagSuggestions[0]).toBe(secondSuggestions);
  });

  it('initializes suggestions when AI replaces all tag controls', () => {
    component.tags.clear();
    component.tags.push(new FormControl('quick'));
    expect(component.tagSuggestions.length).toBe(1);
  });
});
