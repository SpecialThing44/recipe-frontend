import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoginResponse, OidcSecurityService } from 'angular-auth-oidc-client';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpTestingController: HttpTestingController;
  let oidcSecurityService: jasmine.SpyObj<OidcSecurityService>;

  beforeEach(() => {
    oidcSecurityService = jasmine.createSpyObj<OidcSecurityService>('OidcSecurityService', [
      'getAccessToken',
      'forceRefreshSession'
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: OidcSecurityService, useValue: oidcSecurityService }
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('refreshes the session and retries a request after a 401', () => {
    oidcSecurityService.getAccessToken.and.returnValue(of('expired-token'));
    oidcSecurityService.forceRefreshSession.and.returnValue(
      of({
        isAuthenticated: true,
        accessToken: 'refreshed-token'
      } as LoginResponse)
    );

    const httpClient = TestBed.inject(HttpClient);
    httpClient.get('http://localhost:9000/user').subscribe();

    const initialRequest = httpTestingController.expectOne('http://localhost:9000/user');
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer expired-token');
    initialRequest.flush(null, { status: 401, statusText: 'Unauthorized' });

    const retriedRequest = httpTestingController.expectOne('http://localhost:9000/user');
    expect(retriedRequest.request.headers.get('Authorization')).toBe('Bearer refreshed-token');
    retriedRequest.flush({ id: 'user-id' });

    expect(oidcSecurityService.forceRefreshSession).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the session after a forbidden response', () => {
    oidcSecurityService.getAccessToken.and.returnValue(of('valid-token'));

    const httpClient = TestBed.inject(HttpClient);
    httpClient.get('http://localhost:9000/admin').subscribe({ error: () => undefined });

    httpTestingController.expectOne('http://localhost:9000/admin').flush(null, {
      status: 403,
      statusText: 'Forbidden'
    });

    expect(oidcSecurityService.forceRefreshSession).not.toHaveBeenCalled();
  });
  it('does not send tokens or refresh sessions for a different origin', () => {
    const httpClient = TestBed.inject(HttpClient);
    httpClient.get('https://third-party.example/user').subscribe({ error: () => undefined });
    const request = httpTestingController.expectOne('https://third-party.example/user');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(oidcSecurityService.getAccessToken).not.toHaveBeenCalled();
    expect(oidcSecurityService.forceRefreshSession).not.toHaveBeenCalled();
  });

});
