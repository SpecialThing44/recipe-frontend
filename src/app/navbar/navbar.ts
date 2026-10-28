import { Subscription } from 'rxjs';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService, User } from '../core/auth.service';
import { RoutePrefetchService } from '../core/route-prefetch.service';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class Navbar implements OnInit, OnDestroy {
  user: User | null = null;
  private sub: Subscription;

  constructor(
    public auth: AuthService,
    private routePrefetchService: RoutePrefetchService
  ) {
    this.sub = this.auth.currentUser$.subscribe(u => {
      this.user = u;
      this.prefetchLikelyRoutes();
    });
  }

  ngOnInit(): void {
    this.prefetchLikelyRoutes();
  }

  logout() {
    this.auth.logout();
  }

  login() {
    this.auth.login();
  }

  prefetch(path: string): void {
    this.routePrefetchService.prefetchPath(path);
  }

  private prefetchLikelyRoutes(): void {
    const likelyRoutes = ['/dashboard', '/recipes', '/ingredients', '/users'];
    if (this.user?.admin) {
      likelyRoutes.push('/admin/ingredient-weights');
    }
    this.routePrefetchService.scheduleIdlePrefetch(likelyRoutes);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
  }
}
