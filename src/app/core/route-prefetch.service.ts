import { Injectable } from '@angular/core';
import { Route, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RoutePrefetchService {
  private prefetchedPaths = new Set<string>();

  constructor(private router: Router) {}

  prefetchPath(path: string): void {
    if (!this.isEnabled()) {
      return;
    }

    const normalizedPath = this.normalize(path);
    if (!normalizedPath || this.prefetchedPaths.has(normalizedPath)) {
      return;
    }

    const route = this.findMatchingLazyRoute(normalizedPath);
    if (!route?.loadComponent) {
      return;
    }

    this.prefetchedPaths.add(normalizedPath);
    void Promise.resolve(route.loadComponent()).catch(() => {
      this.prefetchedPaths.delete(normalizedPath);
    });
  }

  scheduleIdlePrefetch(paths: string[]): void {
    if (!this.isEnabled() || paths.length === 0) {
      return;
    }

    const uniquePaths = Array.from(new Set(paths.map(path => this.normalize(path)).filter(Boolean)));
    const runPrefetch = () => uniquePaths.forEach(path => this.prefetchPath(path));
    const runtimeWindow = window as any;

    if (typeof runtimeWindow.requestIdleCallback === 'function') {
      runtimeWindow.requestIdleCallback(runPrefetch, { timeout: 1200 });
    } else {
      window.setTimeout(runPrefetch, 250);
    }
  }

  private isEnabled(): boolean {
    const raw = (window as any).ENV?.ROUTE_PREFETCH_ENABLED;
    if (raw === undefined || raw === null || raw === '') {
      return true;
    }

    const disabledValues = ['0', 'false', 'off', 'no'];
    return !disabledValues.includes(String(raw).toLowerCase());
  }

  private normalize(path: string): string {
    const cleanPath = path.trim().replace(/^\/+/, '').split('?')[0].split('#')[0];
    return cleanPath;
  }

  private findMatchingLazyRoute(path: string): Route | undefined {
    return this.router.config.find(route => {
      if (!route.path || route.redirectTo || route.path === '**') {
        return false;
      }

      return this.routeMatches(route.path, path);
    });
  }

  private routeMatches(routePath: string, candidatePath: string): boolean {
    const routeSegments = routePath.split('/');
    const candidateSegments = candidatePath.split('/');

    if (routeSegments.length !== candidateSegments.length) {
      return false;
    }

    return routeSegments.every((segment, index) => {
      if (segment.startsWith(':')) {
        return candidateSegments[index].length > 0;
      }
      return segment === candidateSegments[index];
    });
  }
}
