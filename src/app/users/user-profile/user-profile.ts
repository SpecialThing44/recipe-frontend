import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService, User } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss'
})
export class UserProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  currentUser: User | null = null;
  profileForm: FormGroup;
  loading = false;
  saving = false;
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      countryOfOrigin: ['']
    });
  }

  ngOnInit(): void {
    this.loading = true;

    
    combineLatest([
      this.authService.currentUser$,
      this.route.params
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([currentUser, params]) => {
      this.currentUser = currentUser;
      const userId = params['id'];
      
      if (userId) {
        this.usersService.getUser(userId).subscribe({
          next: (user) => {
            this.user = user;
            console.log('Loaded user:', (<any>user).Body);
            
            const isOwn = this.isOwnProfile();
            
            this.profileForm.patchValue({
              name: user.name || '',
              email: user.email || '',
              countryOfOrigin: user.countryOfOrigin || ''
            }, { emitEvent: false });
            
            if (isOwn) {
              this.profileForm.enable({ emitEvent: false });
            } else {
              this.profileForm.disable({ emitEvent: false });
            }
            
            if (user.avatar?.large) {
              this.avatarPreview = user.avatar.large;
            }
            this.loading = false;
            
          },
          error: (err) => {
            console.error('Error loading user:', err);
            this.snackBar.open('Failed to load user profile', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isOwnProfile(): boolean {
    console.log(this.currentUser, this.user);
    console.log(this.currentUser?.id === this.user?.id);
    return this.currentUser?.id === this.user?.id;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('Image must be less than 5MB', 'Close', { duration: 3000 });
        return;
      }

      this.avatarFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    if (!this.user?.id || this.profileForm.invalid) {
      return;
    }

    this.saving = true;
    const updates: Partial<User> = {};
    
    const formValue = this.profileForm.value;
    if (formValue.name !== this.user.name) {
      updates.name = formValue.name;
    }
    if (formValue.email !== this.user.email) {
      updates.email = formValue.email;
    }
    if (formValue.countryOfOrigin !== this.user.countryOfOrigin) {
      updates.countryOfOrigin = formValue.countryOfOrigin || undefined;
    }

    // Update profile first if there are changes
    if (Object.keys(updates).length > 0) {
      this.usersService.updateUser(this.user.id, updates).subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          if (this.isOwnProfile()) {
            this.authService.currentUser$.next(updatedUser);
          }
          
          // Upload avatar if one was selected
          if (this.avatarFile) {
            this.uploadAvatar();
          } else {
            this.saving = false;
            this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('Error updating profile:', err);
          this.saving = false;
          this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
        }
      });
    } else if (this.avatarFile) {
      // Only avatar update
      this.uploadAvatar();
    } else {
      this.saving = false;
      this.snackBar.open('No changes to save', 'Close', { duration: 2000 });
    }
  }

  private uploadAvatar(): void {
    if (!this.user?.id || !this.avatarFile) {
      return;
    }

    this.usersService.uploadAvatar(this.user.id, this.avatarFile).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        if (this.isOwnProfile()) {
          this.authService.currentUser$.next(updatedUser);
        }
        this.avatarFile = null;
        this.avatarPreview = updatedUser.avatar?.large || null;
        this.saving = false;
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Error uploading avatar:', err);
        this.saving = false;
        this.snackBar.open('Failed to upload avatar', 'Close', { duration: 3000 });
      }
    });
  }

  getAvatarDisplay(): string {
    if (this.avatarPreview) {
      return this.avatarPreview;
    }
    return '';
  }

  hasAvatarToDisplay(): boolean {
    return !!this.avatarPreview;
  }
}
