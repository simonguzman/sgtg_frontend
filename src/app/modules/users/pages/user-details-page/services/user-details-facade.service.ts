import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { User } from '../../../interfaces/user.interface';

@Injectable()
export class UserDetailsFacadeService {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly user = signal<User | undefined>(undefined);
  readonly isLoading = signal(true);
  readonly isMyProfile = signal(false);

  public loadUser(id: string | null): void {
    this.isLoading.set(true);

    if (id) {
      this.isMyProfile.set(false);
      this.userService.getUserByIdMock(id).subscribe({
        next: (data) => {
          this.user.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    } else {
      this.isMyProfile.set(true);
      const currentUser = this.authService.currentUser();
      if (currentUser) {
        this.user.set(currentUser);
      }
      this.isLoading.set(false);
    }
  }

  public goBack(): void {
    if (this.isMyProfile()) {
      this.router.navigate(['/notifications']);
    } else {
      this.router.navigate(['/users']);
    }
  }
}
