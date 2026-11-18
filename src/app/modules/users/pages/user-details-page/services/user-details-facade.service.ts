import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { User } from '../../../interfaces/user.interface';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';

/** Fachada del detalle de un usuario o del perfil propio. */
@Injectable()
export class UserDetailsFacadeService {
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  /** Usuario que se consulta. */
  readonly user = signal<User | undefined>(undefined);
  /** true mientras se carga el usuario. */
  readonly isLoading = signal(true);
  /** true si es el perfil del usuario en sesión. */
  readonly isMyProfile = signal(false);

  /** Carga el usuario indicado, o el de la sesión si no se indica. */
  public loadUser(id: string | null): void {
    this.isLoading.set(true);

    if (id) {
      this.isMyProfile.set(false);
      this.userService.getUserById(id).subscribe({
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

  /** Vuelve a la página anterior o, si no hay, a la bandeja de entrada (perfil propio) o a la gestión de usuarios. */
  public goBack(): void {
    this.navigation.back(() => {
      if (this.isMyProfile()) {
        this.router.navigate(['/notifications']);
      } else {
        this.router.navigate(['/users']);
      }
    });
  }
}
