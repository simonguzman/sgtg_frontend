import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

import { UsersPageComponent } from './users-page.component';
import { UsersFacadeService } from './services/users-facade.service';

import { TableButton, Column } from '../../../../shared/components/table-component/table-component.component';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserRole } from '../../../../core/models/user-role';
import { User } from '../../interfaces/user.interface';
import { UserState } from '../../enum/user-state.enum';
import { UserTableRow } from './models/users-page.model';
import { IdentificationType } from '../../enum/identification-type.enum';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RolesModalComponent } from '../../../../shared/components/modals/roles/roles-modal/roles-modal.component';

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() headerButtons?: TableButton[];
  @Input() value: UserTableRow[] = [];
  @Input() columns: Column[] = [];
  @Input() emptyMessage = '';
  @Input() paginator = false;
  @Output() actionClick = new EventEmitter<{ action: string; row: UserTableRow }>();
  @Output() headerButtonClick = new EventEmitter<TableButton>();
}

@Component({ selector: 'app-roles-modal', standalone: true, template: '' })
class MockRolesModalComponent {
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Input() username = '';
  @Input() roles: UserRole[] = [];
  @Output() onSaved = new EventEmitter<UserRole[]>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  idType: IdentificationType.CC,
  idNumber: 987654,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Pérez',
  secondLastName: 'Sosa',
  email: 'juan@test.com',
  roles: [UserRoleType.DOCENTE],
  password: 'password123',
  codeNumber: 101,
  state: UserState.active,
  ...overrides
});

const createMockUserTableRow = (overrides: Partial<UserTableRow> = {}): UserTableRow => ({
  identificacion: '987654',
  nombre: 'Juan',
  apellidos: 'Pérez',
  estado: 'Activo',
  allowedActions: ['ver', 'editar'],
  originalData: createMockUser(),
  ...overrides
});

const createMockUserRole = (overrides: Partial<UserRole> = {}): UserRole => ({
  type: UserRoleType.DOCENTE,
  assigned: true,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('Component: UsersPageComponent', () => {
  let component: UsersPageComponent;
  let fixture: ComponentFixture<UsersPageComponent>;

  // Tipado estricto de las dependencias simuladas
  let mockRouter: {
    navigate: jest.Mock<Promise<boolean>, [string[]]>;
  };

  let mockFacade: {
    usersTableData: WritableSignal<UserTableRow[]>;
    updateRoles: jest.Mock<void, [string, UserRoleType[], () => void]>;
    findUserById: jest.Mock<User | undefined, [string]>;
    toggleUserStatus: jest.Mock<void, [string, boolean, () => void]>;
  };

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia de advertencias
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    mockFacade = {
      // Las computed properties de Angular devuelven Signals, así que usamos uno
      usersTableData: signal([createMockUserTableRow()]),
      updateRoles: jest.fn(),
      findUserById: jest.fn().mockReturnValue(createMockUser()),
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
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Eventos de la Tabla (Routing)', () => {
    it('debería navegar a la creación de usuario al emitir "Crear usuarios"', () => {
      const mockButton: TableButton = { label: 'Crear usuarios', variant: 'primary', action: 'create' };

      component.handleHeaderButton(mockButton);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users/create']);
    });

    it('no debería hacer nada si la fila no tiene un id de usuario válido', () => {
      const invalidUser = createMockUser({ id: undefined });
      const invalidRow = createMockUserTableRow({ originalData: invalidUser });

      component.handleTableAction({ action: 'ver', row: invalidRow });

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debería navegar a detalles al emitir acción "ver"', () => {
      component.handleTableAction({ action: 'ver', row: createMockUserTableRow() });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users/details', '123']);
    });

    it('debería navegar a edición al emitir acción "editar"', () => {
      component.handleTableAction({ action: 'editar', row: createMockUserTableRow() });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users/edit', '123']);
    });
  });

  describe('Flujo de Asignación de Roles', () => {
    it('debería preparar el modal de roles al emitir "ver roles asignados"', () => {
      component.handleTableAction({ action: 'ver roles asignados', row: createMockUserTableRow() });

      expect(component.idUserForRoles).toBe('123');
      expect(component.selectedUser).toBe('Juan Pérez');
      expect(component.showRolesModal).toBe(true);

      const docenteRole = component.rolesUser.find(r => r.type === UserRoleType.DOCENTE);
      expect(docenteRole?.assigned).toBe(true);
    });

    it('debería guardar roles pendientes y abrir confirmación al ejecutar handleSaveRoles', () => {
      const pending: UserRole[] = [createMockUserRole({ type: UserRoleType.ADMINISTRADOR, assigned: true })];

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
        createMockUserRole({ type: UserRoleType.DOCENTE, assigned: true }),
        createMockUserRole({ type: UserRoleType.ADMINISTRADOR, assigned: false })
      ];
      component.handleSaveRoles(updatedRoles);

      component.confirmChanges();

      // Extraemos los argumentos de la llamada al mock
      const updateCall = mockFacade.updateRoles.mock.calls[0];
      expect(updateCall[0]).toBe('123'); // ID del usuario
      expect(updateCall[1]).toEqual([UserRoleType.DOCENTE]); // Solo los roles marcados como assigned: true

      // Simulamos la ejecución del callback onSuccess()
      const successCallback = updateCall[2];
      successCallback();

      expect(component.showConfirmation).toBe(false);
      expect(component.idUserForRoles).toBeNull();
    });
  });

  describe('Flujo de Habilitar / Deshabilitar Usuario (Soft Delete)', () => {
    it('debería preparar el modal de deshabilitación con el mensaje correcto para usuarios activos', () => {
      component.handleTableAction({ action: 'eliminar', row: createMockUserTableRow() });

      expect(component.idUserToDisabled).toBe('123');
      expect(component.showDisabledConfirmation).toBe(true);
      expect(component.confirmationMessage).toContain('deshabilitar');
    });

    it('debería preparar el modal de habilitación con el mensaje correcto para usuarios inactivos', () => {
      const inactiveRow = createMockUserTableRow({ estado: 'Inactivo' });
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
      expect(toggleCall[1]).toBe(false); // isEnabling es falso porque el usuario original mockeado está activo

      // Simulamos la ejecución del callback onSuccess()
      const successCallback = toggleCall[2];
      successCallback();

      expect(component.showDisabledConfirmation).toBe(false);
      expect(component.idUserToDisabled).toBeNull();
    });
  });
});
