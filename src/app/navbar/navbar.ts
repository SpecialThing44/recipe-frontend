import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatMenuModule, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class Navbar implements OnDestroy {
  user: any = null;
  private sub: any;

  constructor(public auth: AuthService, private router: Router, private cd: ChangeDetectorRef) {
    this.sub = this.auth.currentUser$.subscribe(u => {
      this.user = u;
    });
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.user = null;
        this.router.navigate(['/login']);
      },
      error: () => {
        this.user = null;
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
  }
}