import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss'
})
export class NotFoundComponent {}
