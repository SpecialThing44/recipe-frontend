import { Component, OnInit, Type, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('recipe-frontend');
  navbarComponent: Type<unknown> | null = null;

  async ngOnInit(): Promise<void> {
    const { Navbar } = await import('./navbar/navbar');
    this.navbarComponent = Navbar;
  }
}
