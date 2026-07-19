import { Injectable, computed, inject } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { UsersMapperService } from './users-mapper.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';

@Injectable({ providedIn: 'root' })
export class UsersFacadeService {
  private readonly userService = inject(UserService);
  private readonly mapper = inject(UsersMapperService);
  private readonly notificationService = inject(NotificationService);
  public readonly usersTableData = computed(() => {
    return this.userService.users().map(user => this.mapper.mapUserToTable(user));
  });

  public findUserById(id: string): User | undefined {
    return this.userService.users().find(user => user.id === id);
  }

  public updateRoles(userId: string, finalRoles: UserRoleType[], onSuccess: () => void): void {
    this.showNotification('Actualizando roles y permisos', 'Guardando la nueva configuración...', NotificationType.INFO);

    this.userService.updateUserRolesMock(userId, finalRoles).subscribe({
      next: () => {
        this.showNotification('¡Roles actualizados!', 'Los permisos del usuario se han modificado correctamente.', NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: (err) => {
        this.showNotification('Error al asignar roles', 'No se pudieron actualizar los roles. Intente de nuevo.', NotificationType.ERROR);
        console.error(err);
      }
    });
  }

  public toggleUserStatus(userId: string, isEnabling: boolean, onSuccess: () => void): void {
    const infoMsg = isEnabling ? 'Estamos habilitando al usuario...' : 'Estamos deshabilitando al usuario...';
    this.showNotification('Procesando acción', infoMsg, NotificationType.INFO);

    this.userService.softDeleteUserMock(userId).subscribe({
      next: () => {
        const successTitle = isEnabling ? '¡Usuario habilitado!' : '¡Usuario deshabilitado!';
        const successMsg = isEnabling
          ? 'El usuario ha sido habilitado correctamente.'
          : 'El usuario ha sido deshabilitado correctamente.';
        this.showNotification(successTitle, successMsg, NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: (err) => {
        const errTitle = isEnabling ? 'Error al habilitar' : 'Error al deshabilitar';
        this.showNotification(errTitle, 'No se pudo completar la acción. Intente de nuevo.', NotificationType.ERROR);
        console.error(err);
      }
    });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
