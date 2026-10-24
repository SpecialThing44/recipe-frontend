import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('provides a skip link to the main page content', () => {
    const fixture = TestBed.createComponent(App);
    spyOn(fixture.componentInstance, 'ngOnInit').and.resolveTo();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(compiled.querySelector('main#main-content router-outlet')).not.toBeNull();
  });
  it('focuses content without following the base URL to another page', () => {
    const fixture = TestBed.createComponent(App);
    spyOn(fixture.componentInstance, 'ngOnInit').and.resolveTo();
    fixture.detectChanges();
    const content = fixture.nativeElement.querySelector('main') as HTMLElement;
    const focus = spyOn(content, 'focus');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('.skip-link').dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(focus).toHaveBeenCalled();
  });

});
