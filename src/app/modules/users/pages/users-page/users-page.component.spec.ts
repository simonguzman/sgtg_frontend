/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { UsersPageComponent } from './users-page.component';
import { UsersFacadeService } from './services/users-facade.service';

import { TableComponent, TableButton, Column } from '../../../../shared/components/table-component/table-component.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RolesModalComponent } from '../../../../shared/components/modals/roles/roles-modal/roles-modal.component';

import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserRole } from '../../../../core/models/user-role';
import { User } from '../../interfaces/user.interface';
import { UserState } from '../../enum/user-state.enum';
import { UserTableRow } from './models/users-page.model';
import { IdentificationType } from '../../enum/identification-type.enum';

// ==========================================
// MOCKS DE COMPONENTES HIJOS (TIPADOS)
// ==========================================
@Component({ selector: 'app-table-component', standalone: true, template: '<div>Mock Table</div>' })
class MockTableComponent {
  @Input() headerButtons?: TableButton[];
  @Input() value: UserTableRow[] = [];
  @Input() columns: Column[] = [];
  @Input() emptyMessage = '';
  @Input() paginator = false;
  @Output() actionClick = new EventEmitter<{ action: string; row: UserTableRow }>();
  @Output() headerButtonClick = new EventEmitter<TableButton>();
}

@Component({ selector: 'app-roles-modal', standalone: true, template: '<div>Mock Roles Modal</div>' })
class MockRolesModalComponent {
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Input() username = '';
  @Input() roles: UserRole[] = [];
  @Output() onSaved = new EventEmitter<UserRole[]>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '<div>Mock Confirmation Modal</div>' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ==========================================
// SUITE DE PRUEBAS
// ==========================================
describe('Component: UsersPageComponent', () => {
  let component: UsersPageComponent;
  let fixture: ComponentFixture<UsersPageComponent>;

  let mockRouter: { navigate: jest.Mock };
  let mockFacade: {
    usersTableData: jest.Mock;
    updateRoles: jest.Mock;
    findUserById: jest.Mock;
    toggleUserStatus: jest.Mock;
  };

  const mockUser: User = {
    id: '123',
    idType: IdentificationType.CC,
    idNumber: 987654,
    firstName: 'Juan',
    lastName: 'Pérez',
    secondLastName: 'Sosa',
    email: 'juan@test.com',
    roles: [UserRoleType.DOCENTE],
    password: 'password123',
    codeNumber: 101,
    state: UserState.active
  };

  const mockRow: UserTableRow = {
    identificacion: '987654',
    nombre: 'Juan',
    apellidos: 'Pérez',
    estado: 'Activo',
    allowedActions: ['ver', 'editar'],
    originalData: mockUser
  };

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    mockFacade = {
      usersTableData: jest.fn().mockReturnValue(signal([mockRow])()),
      updateRoles: jest.fn(),
      findUserById: jest.fn().mockReturnValue(mockUser),
      toggleUserStatus: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UsersPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: UsersFacadeService, useValue: mockFacade }
      ]
    })
    .overrideComponent(UsersPageComponent, {
      remove: {
        imports: [TableComponent, RolesModalComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockTableComponent, MockRolesModalComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Eventos de la Tabla (Routing)', () => {
    it('debería navegar a la creación de usuario al emitir "Crear usuarios"', () => {
      const mockButton: TableButton = { label: 'Crear usuarios', variant: 'primary' };
      component.handleHeaderButton(mockButton);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users/create']);
    });

    it('no debería hacer nada si la fila no tiene un id de usuario válido', () => {
      const invalidUser: User = { ...mockUser, id: undefined };
      const invalidRow: UserTableRow = { ...mockRow, originalData: invalidUser };

      component.handleTableAction({ action: 'ver', row: invalidRow });
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debería navegar a detalles al emitir acción "ver"', () => {
      component.handleTableAction({ action: 'ver', row: mockRow });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users/details', '123']);
    });

    it('debería navegar a edición al emitir acción "editar"', () => {
      component.handleTableAction({ action: 'editar', row: mockRow });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users/edit', '123']);
    });
  });

  describe('Flujo de Asignación de Roles', () => {
    it('debería preparar el modal de roles al emitir "ver roles asignados"', () => {
      component.handleTableAction({ action: 'ver roles asignados', row: mockRow });

      expect(component.idUserForRoles).toBe('123');
      expect(component.selectedUser).toBe('Juan Pérez');
      expect(component.showRolesModal).toBe(true);

      const docenteRole = component.rolesUser.find(r => r.type === UserRoleType.DOCENTE);
      expect(docenteRole?.assigned).toBe(true);
    });

    it('debería guardar roles pendientes y abrir confirmación al ejecutar handleSaveRoles', () => {
      const pending: UserRole[] = [{ type: UserRoleType.ADMINISTRADOR, assigned: true }];

      component.handleSaveRoles(pending);

      expect(component.showRolesModal).toBe(false);
      expect(component.showConfirmation).toBe(true);
    });

    it('debería abortar confirmChanges si no hay ID de usuario', () => {
      component.idUserForRoles = null;
      component.confirmChanges();
      expect(mockFacade.updateRoles).not.toHaveBeenCalled();
    });

    it('debería mapear roles, enviarlos al facade y limpiar el estado al confirmar', () => {
      component.idUserForRoles = '123';
      const updatedRoles: UserRole[] = [
        { type: UserRoleType.DOCENTE, assigned: true },
        { type: UserRoleType.ADMINISTRADOR, assigned: false }
      ];
      component.handleSaveRoles(updatedRoles);

      component.confirmChanges();

      const updateCall = mockFacade.updateRoles.mock.calls[0];
      expect(updateCall[0]).toBe('123');
      expect(updateCall[1]).toEqual([UserRoleType.DOCENTE]);

      const successCallback = updateCall[2];
      successCallback();

      expect(component.showConfirmation).toBe(false);
      expect(component.idUserForRoles).toBeNull();
    });
  });

  describe('Flujo de Habilitar / Deshabilitar Usuario (Soft Delete)', () => {
    it('debería preparar el modal de deshabilitación con el mensaje correcto para usuarios activos', () => {
      component.handleTableAction({ action: 'eliminar', row: mockRow });

      expect(component.idUserToDisabled).toBe('123');
      expect(component.showDisabledConfirmation).toBe(true);
      expect(component.confirmationMessage).toContain('deshabilitar');
    });

    it('debería preparar el modal de habilitación con el mensaje correcto para usuarios inactivos', () => {
      const inactiveRow: UserTableRow = { ...mockRow, estado: 'Inactivo' };
      component.handleTableAction({ action: 'activar', row: inactiveRow });

      expect(component.idUserToDisabled).toBe('123');
      expect(component.showDisabledConfirmation).toBe(true);
      expect(component.confirmationMessage).toContain('habilitar nuevamente');
    });

    it('debería abortar confirmSoftDelete si no hay ID de usuario', () => {
      component.idUserToDisabled = null;
      component.confirmSoftDelete();
      expect(mockFacade.toggleUserStatus).not.toHaveBeenCalled();
    });

    it('debería delegar al facade y limpiar el estado al confirmar el cambio de estado', () => {
      component.idUserToDisabled = '123';

      component.confirmSoftDelete();

      const toggleCall = mockFacade.toggleUserStatus.mock.calls[0];
      expect(toggleCall[0]).toBe('123');
      expect(toggleCall[1]).toBe(false);

      const successCallback = toggleCall[2];
      successCallback();

      expect(component.showDisabledConfirmation).toBe(false);
      expect(component.idUserToDisabled).toBeNull();
    });
  });
});
