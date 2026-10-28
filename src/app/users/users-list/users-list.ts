import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { UsersService, User, UsersFilters } from '../../core/users.service';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatExpansionModule
  ],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  users: User[] = [];
  loading = false;
  error: string | null = null;

  readonly filterForm;
  
  // Filter type options
  filterTypes = [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' }
  ];

  // Pagination options
  pageSizes = [10, 25, 50, 100];
  currentPage = 0;
  get pageSize(): number {
    return this.filterForm.get('pageSize')?.value || 25;
  }

  // Sorting options
  sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'none', label: 'No Sorting' }
  ];

  constructor(
    private usersService: UsersService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.filterForm = this.fb.nonNullable.group({
      id: [''],
      
      nameFilterType: ['contains'],
      nameValue: [''],
      
      emailFilterType: ['contains'],
      emailValue: [''],
      
      sort: ['none'],
      
      pageSize: [25]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.getRawValue();
    const filters: UsersFilters = {
      limit: this.pageSize,
      page: this.currentPage
    };

    // ID filter
    if (formValue.id?.trim()) {
      filters.id = formValue.id.trim();
    }

    // Name filter
    if (formValue.nameValue?.trim()) {
      filters.name = { [formValue.nameFilterType]: formValue.nameValue.trim() };
    }

    // Email filter
    if (formValue.emailValue?.trim()) {
      filters.email = { [formValue.emailFilterType]: formValue.emailValue.trim() };
    }

    // Sorting
    if (formValue.sort && formValue.sort !== 'none') {
      const [field, direction] = formValue.sort.split('-');
      if (field === 'name') {
        filters.orderBy = { name: direction === 'asc' };
      }
    }


    this.request?.unsubscribe();
    this.request = this.usersService.listUsers(filters).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error = 'We couldn’t load the users. Please check your connection and try again.';
        this.loading = false;
        this.users = [];
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      id: '',
      nameFilterType: 'contains',
      nameValue: '',
      emailFilterType: 'contains',
      emailValue: '',
      sort: 'none',
      pageSize: 25
    });
    this.currentPage = 0;
    this.loadUsers();
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.users.length === this.pageSize) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  viewUser(userId: string): void {
    this.router.navigate(['/users', userId]);
  }
}
