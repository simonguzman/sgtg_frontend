import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule, Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ChangePasswordModalComponent } from '../../../../shared/components/modals/change-password-modal/change-password-modal.component';
import { InboxService } from '../../../../modules/notifications/services/inbox.service';

@Component({
  selector: 'app-header',
  // ← CommonModule eliminado: el template solo usa @if nativo.
  imports: [AvatarModule, MenuModule, ConfirmationActionModalComponent, ChangePasswordModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected readonly authService = inject(AuthService);
  protected readonly inboxService = inject(InboxService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  // @ViewChild con `!` es aquí el patrón correcto (no el mismo caso que
  // LoginComponent): la referencia solo existe después de que la vista se
  // inicializa, no hay forma idiomática de evitarlo con un ViewChild.
  @ViewChild('menu') menu!: Menu;

  // ← Convertidos a signal(): mismo patrón que isConfirmModalOpen,
  // isUploadModalOpen, etc. en el resto del proyecto.
  readonly isMenuOpen = signal(false);
  readonly isLogoutModal = signal(false);
  readonly isChangePasswordModal = signal(false);

  protected readonly userAvatar = 'assets/images/avatar-default.png';

  // ← FIX: eliminada la reimplementación manual con regex. El comentario
  // original decía que reutilizaba UserFormatterService pero no lo hacía.
  protected readonly userFullName = computed<string>(() => {
    const user = this.authService.currentUser();
    return user ? this.userService.formatFullName(user) : 'Invitado';
  });

  // ← NUEVO: con un solo rol el resultado es idéntico al binding anterior
  // ({{ currentUser()?.roles }} mostraba "Administrador" en tu captura).
  // Con varios roles, evita el "Director,Jurado" pegado sin espacio.
  protected readonly userRoleLabel = computed<string>(() => {
    const roles = this.authService.currentUser()?.roles;
    return roles && roles.length > 0 ? roles.join(' / ') : '';
  });

  protected readonly menuItems: MenuItem[] = [
    { label: 'Mi Perfil', icon: 'pi pi-user', command: () => this.goToProfile() },
    { separator: true },
    { label: 'Cambiar contraseña', icon: 'pi pi-key', command: () => this.openChangePasswordModal() },
    { separator: true },
    { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', command: () => this.openLogoutModal() }
  ];

  goToInbox(): void {
    this.router.navigate(['/notifications']);
  }

  onMenuToggle(event: Event): void {
    this.isMenuOpen.update(open => !open);
    this.menu.toggle(event);
  }

  goToProfile(): void {
    this.router.navigate(['/users/profile']);
  }

  openLogoutModal(): void {
    this.isLogoutModal.set(true);
  }

  cancelLogout(): void {
    this.isLogoutModal.set(false);
  }

  confirmLogout(): void {
    this.isLogoutModal.set(false);
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  openChangePasswordModal(): void {
    this.isChangePasswordModal.set(true);
  }

  closeChangePasswordModal(): void {
    this.isChangePasswordModal.set(false);
  }

  // ← closeMenu() eliminado: verificado contra el template completo, no
  // se llama desde ningún binding — era código muerto.
}
