import { Injectable, computed, inject, signal } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { UsersMapperService } from './users-mapper.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { ManagedUser } from '../../../helpers/user-management.helper';
import { CatalogItem } from '../../../interfaces/catalog-item.interface';
import { UserState } from '../../../enum/user-state.enum';
import { AuthService } from '../../../../../core/services/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class UsersFacadeService {
  private readonly userService = inject(UserService);
  private readonly mapper = inject(UsersMapperService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
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

  /**
   * Departamentos en los que el gestor puede cambiar el Comité: los de los
   * docentes que gestiona (para el Comité y el jefe, solo el suyo).
   */
  public readonly committeeDepartments = computed<CatalogItem[]>(() => {
    const departamentos = new Map<number, CatalogItem>();
    this.managedUsers().forEach(({ user }) => {
      if (user.department) departamentos.set(user.department.id, user.department);
    });
    return [...departamentos.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  /** Comité actual del departamento (uno por departamento), si lo hay. */
  public committeeOf(departmentId: number | null): User | undefined {
    return this.managedUsers().map(({ user }) => user).find(user => user.state === UserState.active
      && user.department?.id === departmentId && user.roles.includes(UserRoleType.COMITE));
  }

  /** Docentes activos del departamento que pueden recibir el rol de Comité. */
  public committeeCandidates(departmentId: number | null): User[] {
    return this.managedUsers().map(({ user }) => user).filter(user => user.state === UserState.active
      && user.department?.id === departmentId && !user.roles.includes(UserRoleType.COMITE));
  }

  /**
   * Cambia el Comité del departamento del docente. Si quien lo tenía es el
   * usuario de la sesión (lo cedió), el backend ya cerró sus sesiones: se le
   * avisa y se cierra también aquí.
   */
  public changeCommittee(userId: string, onSuccess: () => void, onError?: () => void): void {
    const nuevo = this.findUserById(userId);
    const sesionId = this.authService.currentUser()?.id;
    const cedeElSuyo = !!sesionId && this.committeeOf(nuevo?.department?.id ?? null)?.id === sesionId;
    this.userService.changeCommittee(userId).subscribe({
      next: comite => {
        const nombre = `${comite.firstName} ${comite.lastName}`;
        if (cedeElSuyo) {
          this.showNotification('Rol de Comité cedido',
            `${nombre} es ahora el Comité de programa. Tu sesión se cerró; sigues como docente.`, NotificationType.CONFIRMATION);
          this.authService.logout();
          return;
        }
        this.showNotification('Comité actualizado', `${nombre} es ahora el Comité de programa del departamento.`,
          NotificationType.CONFIRMATION);
        this.loadUsers();
        onSuccess();
      },
      error: err => {
        this.showNotification('No se cambió el Comité',
          apiErrorMessage(err, 'No se pudo cambiar el Comité. Intente de nuevo.'), NotificationType.ERROR);
        onError?.();
      }
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
