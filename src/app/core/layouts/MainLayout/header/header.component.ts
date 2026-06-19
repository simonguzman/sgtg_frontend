import { Component, inject, ViewChild } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule, Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth/auth.service';
import { Router } from '@angular/router';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ChangePasswordModalComponent } from '../../../../shared/components/modals/change-password-modal/change-password-modal.component';
import { InboxService } from '../../../../modules/notifications/services/inbox.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, AvatarModule, MenuModule, ConfirmationActionModalComponent, ChangePasswordModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // 2. INYECTA EL SERVICIO
  protected inboxService = inject(InboxService);

  @ViewChild('menu') menu!: Menu;
  isMenuOpen = false;
  isLogoutModal = false;
  isChangePasswordModal = false;

  userName = 'Admin';
  userRole = 'Administrador';
  userAvatar = 'assets/images/avatar-default.png';

  menuItems: MenuItem[] = [
    {
      label: 'Mi Perfil',
      icon: 'pi pi-user',
      command: () => this.goToProfile()
    },
    { separator: true},
    {
      label: 'Cambiar contraseña',
      icon: 'pi pi-key',
      command: () => this.openChangePasswordModal()
    },
    { separator: true },
    {
      label: 'Cerrar Sesión',
      icon: 'pi pi-sign-out',
      command: () => this.openLogoutModal()
    }
  ];

  // 3. AGREGA LA NAVEGACIÓN A LA BANDEJA
  goToInbox() {
    this.router.navigate(['/notifications']); // O la ruta que definiste en tu app.routes
  }

  onMenuToggle(event: Event) {
    this.isMenuOpen = !this.isMenuOpen;
    this.menu.toggle(event);
  }

  goToProfile() {
    this.router.navigate(['/users/profile']);
  }

  // ... (el resto de tus métodos de modales se quedan igual)
  closeMenu() { this.isMenuOpen = false; }
  openLogoutModal() { this.isLogoutModal = true; }
  cancelLogout() { this.isLogoutModal = false; }
  confirmLogout(){
    this.isLogoutModal = false;
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
  openChangePasswordModal() { this.isChangePasswordModal = true; }
  closeChangePasswordModal() { this.isChangePasswordModal = false; }
}
