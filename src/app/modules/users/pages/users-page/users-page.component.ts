import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { stateList } from '../../../../core/enums/state.enum';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserRole } from '../../../../core/models/user-role';
import { User } from '../../interfaces/user.interface';
import { UserState } from '../../enum/user-state.enum';
import { TableButton, TableComponent } from "../../../../shared/components/table-component/table-component.component";
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RolesModalComponent } from '../../../../shared/components/modals/roles/roles-modal/roles-modal.component';
import { UsersFacadeService } from './services/users-facade.service';
import { AuthStorageService } from '../../../../core/services/auth/auth-storage.service';
import { puedeAsignarRol } from '../../helpers/user-management.helper';
import { USER_COLUMNS, USER_FILTER_FIELDS, USER_HEADER_BUTTONS, UserTableRow } from './models/users-page.model';

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
export class UsersPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authStorage = inject(AuthStorageService);
  protected readonly facade = inject(UsersFacadeService);

  protected columns = USER_COLUMNS;
  protected readonly filterFields = USER_FILTER_FIELDS;
  protected headerButtons = USER_HEADER_BUTTONS;
  protected readonly stateList = stateList;

  showRolesModal = false;
  showConfirmation = false;
  idUserForRoles: string | null = null;
  selectedUser = '';
  rolesUser: UserRole[] = [];
  /** false si el gestor solo consulta los roles del usuario */
  canManageRoles = true;
  private pendingRoles: UserRole[] = [];

  showDisabledConfirmation = false;

  ngOnInit(): void {
    // La lista se carga al iniciar sesión; aquí se refresca con los últimos cambios
    this.facade.loadUsers();
  }
  idUserToDisabled: string | null = null;
  confirmationMessage = ' ';

  handleHeaderButton(button: TableButton): void {
    if (button.label === 'Crear usuarios') {
      this.router.navigate(['/users/create']);
    }
  }

  handleTableAction(event: { action: string, row: UserTableRow }): void {
    const user = event.row.originalData;
    if (!user?.id) return;

    switch (event.action) {
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

  private prepareRolesModal(user: User, row: UserTableRow): void {
    this.idUserForRoles = user.id!;
    this.selectedUser = `${row.nombre} ${row.apellidos}`;
    const userRolesType = user.roles || [];

    // Quien no es el administrador solo asigna o quita Estudiante y Docente
    const gestor = this.authStorage.currentUser();
    this.rolesUser = Object.values(UserRoleType).map(type => ({
      type,
      assigned: userRolesType.includes(type),
      locked: !puedeAsignarRol(gestor, type)
    }));
    this.canManageRoles = row.allowedActions.includes('editar');
    this.showRolesModal = true;
  }

  handleSaveRoles(updatedRoles: UserRole[]): void {
    this.pendingRoles = updatedRoles;
    this.showRolesModal = false;
    this.showConfirmation = true;
  }

  confirmChanges(): void {
    if (!this.idUserForRoles) return;

    const finalsRoles = this.pendingRoles
      .filter(rol => rol.assigned)
      .map(rol => rol.type);

    this.facade.updateRoles(this.idUserForRoles, finalsRoles, () => {
      this.showConfirmation = false;
      this.pendingRoles = [];
      this.idUserForRoles = null;
    });
  }

  private prepareDisabledModal(user: User, row: UserTableRow): void {
    this.idUserToDisabled = user.id!;
    this.selectedUser = `${row.nombre} ${row.apellidos}`;
    const isInactive = row.estado === 'Inactivo';

    this.confirmationMessage = isInactive
      ? `¿Desea habilitar nuevamente al usuario ${this.selectedUser}?`
      : `¿Desea deshabilitar al usuario ${this.selectedUser}? Esta acción limitará sus accesos al sistema.`;

    this.showDisabledConfirmation = true;
  }

  confirmSoftDelete(): void {
    if (!this.idUserToDisabled) return;

    const user = this.facade.findUserById(this.idUserToDisabled);
    const isEnabling = user?.state === UserState.inactive;

    this.facade.toggleUserStatus(this.idUserToDisabled, isEnabling, () => {
      this.showDisabledConfirmation = false;
      this.idUserToDisabled = null;
    });
  }
}
