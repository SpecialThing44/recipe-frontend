import { Component, ElementRef, OnInit, Type, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  @ViewChild('mainContent') private mainContent?: ElementRef<HTMLElement>;

  skipToContent(event: Event): void {
    event.preventDefault();
    this.mainContent?.nativeElement.focus();
  }

  protected readonly title = signal('recipe-frontend');
  navbarComponent: Type<unknown> | null = null;

  async ngOnInit(): Promise<void> {
    const { Navbar } = await import('./navbar/navbar');
    this.navbarComponent = Navbar;
  }
}
