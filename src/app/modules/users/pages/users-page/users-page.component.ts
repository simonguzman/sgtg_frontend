import { stateList } from '../../../../core/enums/state.enum';
import { Component, computed, inject } from '@angular/core';
import { TableComponent, Column, TableButton } from "../../../../shared/components/table-component/table-component.component";
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { UserRole, UserRoleType } from '../../../../core/models/user-role';
import { Router } from '@angular/router';
import { RolesModalComponent } from '../../../../shared/components/modals/roles/roles-modal/roles-modal.component';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { User, UserState } from '../../interfaces/user.interface';

const USER_COLUMNS: Column[] = [
  { field: 'identificacion', header: 'Identificación', type: 'text', width: '15%' },
  { field: 'nombre', header: 'Nombre', type: 'text', width: '15%' },
  { field: 'apellidos', header: 'Apellidos', type: 'text', width: '15%' },
  { field: 'estado', header: 'Estado', type: 'text', width: '15%' },
  {
    field: 'roles',
    header: 'Descripción',
    type: 'actions',
    width: '20%',
    actions: [
      { action: 'ver roles asignados', label: 'Ver roles asignados', variant: 'primary', disabled: false }
    ]
  },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    width: '20%',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar', icon: 'edit', variant: 'primary', disabled: false },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: false },
      { action: 'activar', icon: 'person_check', variant: 'primary', disabled: false }
    ]
  },
];

const USER_HEADER_BUTTONS: TableButton[] = [
  { label: 'Crear usuarios', variant: 'primary' }
];

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    TableComponent,
    RolesModalComponent,
    ConfirmationActionModalComponent
  ],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.css',
})
export class UsersPageComponent {
  readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  protected columns: Column[] = USER_COLUMNS;
  protected headerButtons: TableButton[] = USER_HEADER_BUTTONS;
  protected readonly stateList = stateList;

  selectedUser = '';
  isModalOpen = false;

  showRolesModal = false;
  showConfirmation = false;
  idUserForRoles: string | null = null;
  rolesUser: UserRole[] = [];
  private pendingRoles: UserRole[] = [];

  showDisabledConfirmation = false;
  idUserToDisabled: string | null = null;
  confirmationMessage = ' ';

  usersTableData = computed(() => {
    return this.userService.users().map(user => this.mapUserToTable(user));
  });

  get displayValue() {
    return this.usersTableData();
  }

  private mapUserToTable(user: User) {
    const isInactive = user.state === UserState.inactive;
    const allowed = isInactive
      ? ['activar']
      : ['ver roles asignados', 'ver', 'editar', 'eliminar'];
    return {
      identificacion: user.idNumber?.toString() || '',
      nombre: user.firstName,
      apellidos: `${user.lastName} ${user.secondLastName || ''}`,
      estado: isInactive ? 'Inactivo' : 'Activo',
      allowedActions: allowed,
      originalData: user
    };
  }

  handleHeaderButton(button: TableButton) {
    if (button.label === 'Crear usuarios') {
      this.router.navigate(['/users/create']);
    }
  }

  handleTableAction(event: { action: string, row: any }) {
    const user = event.row.originalData as User;
    if(!user) return;
    switch (event.action){
      case 'ver roles asignados':
        this.prepareRolesModal(user, event.row);
        break;
      case 'ver':
        this.router.navigate(['/users/details', user.id]);
        break;
      case 'editar':
        this.router.navigate(['/users/edit', user.id]);
        break;
      case 'eliminar':
      case 'activar':
        this.prepareDisabledModal(user, event.row);
        break;
    }
  }

  handleFileUploaded(event: { fileName: string, file: File }) {
    console.log('Archivo recibido:', event.fileName);
  }
  private prepareRolesModal(user: User, row: any) {
    this.idUserForRoles = user.id!;
    this.selectedUser = `${row.nombre} ${row.apellidos}`;
    const userRolesType = user.roles || [];
    this.rolesUser = Object.values(UserRoleType).map(type => ({
      type,
      assigned: userRolesType.includes(type)
    }));

    this.showRolesModal = true;
  }

  private prepareDisabledModal(user: User, row: any) {
    this.idUserToDisabled = user.id!;
    this.selectedUser = `${row.nombre} ${row.apellidos}`;
    const isInactive = row.estado === 'Inactivo';
    this.confirmationMessage = isInactive
      ? `¿Desea habilitar nuevamente al usuario ${this.selectedUser}?`
      : `¿Desea deshabilitar al usuario ${this.selectedUser}? Esta acción limitará sus accesos al sistema.`;
    this.showDisabledConfirmation = true;
  }

  handleSaveRoles(updatedRoles: UserRole[]) {
    console.log(`Guardando roles para ${this.selectedUser}:`, updatedRoles);
    this.pendingRoles = updatedRoles;
    this.showRolesModal = false;
    this.showConfirmation = true;
  }

  confirmChanges() {
    if (!this.idUserForRoles) return;

    const finalsRoles = this.pendingRoles
      .filter(rol => rol.assigned === true)
      .map(rol => rol.type);

    this.showChangesRolesInfo();

    this.userService.updateUserRolesMock(this.idUserForRoles, finalsRoles).subscribe({
      next: () => {
        this.showChangesRolesSuccess();
        this.showConfirmation = false;
        this.pendingRoles = [];
        this.idUserForRoles = null;
      },
      error: (err) => {
        this.showChangesRolesError();
        console.error(err);
      }
    });
  }

  confirmSoftDelete() {
    if(!this.idUserToDisabled) return;

    const user = this.userService.users().find(u => u.id === this.idUserToDisabled);
    const isEnabling = user?.state === UserState.inactive;

    this.showSoftDeleteInfo(isEnabling);

    this.userService.softDeleteUserMock(this.idUserToDisabled).subscribe({
        next:() => {
          this.showSoftDeleteSuccess(isEnabling);
          this.showDisabledConfirmation = false;
          this.idUserToDisabled = null;
        },
        error: (err) => {
          this.showSoftDeleteError(isEnabling);
          console.error(err)
      }
    });
  }

  private showChangesRolesSuccess() {
    this.notificationService.show({
      title:'¡Roles actualizados!',
      message: 'Los permisos del usuario se han modificado correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showChangesRolesInfo() {
    this.notificationService.show({
      title:'Actualizando roles y permisos',
      message: 'Guardando la nueva configuración de roles en el sistema...',
      type: NotificationType.INFO
    });
  }

  private showChangesRolesError() {
    this.notificationService.show({
      title:'Error al asignar roles',
      message: 'No se pudieron actualizar los roles del usuario. Por favor, intente de nuevo.',
      type: NotificationType.ERROR
    });
  }

  private showSoftDeleteSuccess(isEnabling: boolean) {
    this.notificationService.show({
      title: isEnabling ? '¡Usuario habilitado!' : '¡Usuario deshabilitado!',
      message: isEnabling
        ? 'El usuario ha sido habilitado del sistema correctamente.'
        : 'El usuario ha sido deshabilitado del sistema correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showSoftDeleteInfo(isEnabling: boolean) {
    this.notificationService.show({
      title:'Procesando acción',
      message: isEnabling
        ? 'Estamos habilitando al usuario del sistema...'
        : 'Estamos deshabilitando al usuario del sistema...',
      type: NotificationType.INFO
    });
  }

  private showSoftDeleteError(isEnabling: boolean) {
    this.notificationService.show({
      title: isEnabling ? 'Error al habilitar usuario' : 'Error al deshabilitar usuario',
      message: isEnabling
        ? 'No se pudo habilitar el usuario. Intente de nuevo.'
        : 'No se pudo deshabilitar el usuario. Intente de nuevo.',
      type: NotificationType.ERROR
    });
  }
}
