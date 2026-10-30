import { Injectable, computed, inject, signal } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { UsersMapperService } from './users-mapper.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { ManagedUser } from '../../../helpers/user-management.helper';

@Injectable({ providedIn: 'root' })
export class UsersFacadeService {
  private readonly userService = inject(UserService);
  private readonly mapper = inject(UsersMapperService);
  private readonly notificationService = inject(NotificationService);
  /** Usuarios del alcance del gestor (todos para el administrador, Consejo y Decanatura) */
  private readonly managedUsers = signal<ManagedUser[]>([]);

  public readonly usersTableData = computed(() =>
    this.managedUsers().map(({ user, editable }) => this.mapper.mapUserToTable(user, editable))
  );

  public loadUsers(): void {
    this.userService.loadManagedUsers().subscribe({
      next: users => this.managedUsers.set(users),
      error: error => console.warn('No se pudo cargar la gestión de usuarios', error?.status)
    });
  }

  public findUserById(id: string): User | undefined {
    return this.managedUsers().find(({ user }) => user.id === id)?.user;
  }

  public updateRoles(userId: string, finalRoles: UserRoleType[], onSuccess: () => void): void {
    this.showNotification('Actualizando roles y permisos', 'Guardando la nueva configuración...', NotificationType.INFO);

    this.userService.updateUserRoles(userId, finalRoles).subscribe({
      next: () => {
        this.showNotification('¡Roles actualizados!', 'Los permisos del usuario se han modificado correctamente.', NotificationType.CONFIRMATION);
        this.loadUsers();
        onSuccess();
      },
      error: (err) => {
        this.showNotification('Error al asignar roles', apiErrorMessage(err, 'No se pudieron actualizar los roles. Intente de nuevo.'), NotificationType.ERROR);
        console.error(err);
      }
    });
  }

  public toggleUserStatus(userId: string, isEnabling: boolean, onSuccess: () => void): void {
    const infoMsg = isEnabling ? 'Estamos habilitando al usuario...' : 'Estamos deshabilitando al usuario...';
    this.showNotification('Procesando acción', infoMsg, NotificationType.INFO);

    this.userService.softDeleteUser(userId).subscribe({
      next: () => {
        const successTitle = isEnabling ? '¡Usuario habilitado!' : '¡Usuario deshabilitado!';
        const successMsg = isEnabling
          ? 'El usuario ha sido habilitado correctamente.'
          : 'El usuario ha sido deshabilitado correctamente.';
        this.showNotification(successTitle, successMsg, NotificationType.CONFIRMATION);
        this.loadUsers();
        onSuccess();
      },
      error: (err) => {
        const errTitle = isEnabling ? 'Error al habilitar' : 'Error al deshabilitar';
        this.showNotification(errTitle, apiErrorMessage(err, 'No se pudo completar la acción. Intente de nuevo.'), NotificationType.ERROR);
        console.error(err);
      }
    });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
