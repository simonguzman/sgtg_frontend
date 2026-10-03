import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UserFormComponent } from './user-form.component';
import { User } from '../../interfaces/user.interface';
import { IdentificationType } from '../../enum/identification-type.enum';
import { UserState } from '../../enum/user-state.enum';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserRole } from '../../../../core/models/user-role';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { RolesSelectionModalComponent } from '../../../../shared/components/modals/roles/roles-selection-modal/roles-selection-modal.component';

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
  @Input() type!: string;
}

@Component({ selector: 'app-roles-selection-modal', standalone: true, template: '' })
class MockRolesSelectionModalComponent {
  @Input() isOpen!: boolean;
  @Input() roles!: UserRole[];
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSaved = new EventEmitter<UserRole[]>();
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '11111111-1111-1111-1111-111111111111',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Test',
  secondName: '',
  lastName: 'User',
  secondLastName: '',
  email: 'test@test.com',
  password: 'password123',
  codeNumber: 1,
  state: UserState.active,
  roles: [UserRoleType.DOCENTE],
  ...overrides
});

const createMockUserRole = (overrides: Partial<UserRole> = {}): UserRole => ({
  type: UserRoleType.ADMINISTRADOR,
  assigned: false,
  ...overrides
});

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let mockNotificationService: {
    show: jest.Mock<void, [any]>;
  };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockNotificationService = {
      show: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UserFormComponent, ReactiveFormsModule],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    })
    .overrideComponent(UserFormComponent, {
      remove: { imports: [ButtonComponent, RolesSelectionModalComponent] },
      add: { imports: [MockButtonComponent, MockRolesSelectionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Inicialización y validaciones del formulario', () => {
    it('debería inicializar el formulario como inválido (vacío)', () => {
      expect(component.userForm.invalid).toBeTruthy();
    });

    it('debería requerir los campos obligatorios', () => {
      const emailControl = component.userForm.get('email');
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBeTruthy();
    });

    it('debería validar la longitud mínima de la contraseña', () => {
      const passwordControl = component.userForm.get('password');
      passwordControl?.setValue('12345');
      expect(passwordControl?.hasError('minlength')).toBeTruthy();
      passwordControl?.setValue('123456');
      expect(passwordControl?.hasError('minlength')).toBeFalsy();
    });
  });

  describe('Interacción con Inputs (Signals) y Modo Edición', () => {
    it('debería popular el formulario y establecer isEditMode en true si se pasa un usuario', () => {
      const mockUser = createMockUser({
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@test.com',
        roles: [UserRoleType.ADMINISTRADOR]
      });
      fixture.componentRef.setInput('user', mockUser);
      fixture.detectChanges();
      expect(component.isEditMode).toBeTruthy();
      expect(component.userForm.get('firstName')?.value).toBe('Juan');
      expect(component.userForm.get('email')?.value).toBe('juan@test.com');
    });

    it('debería cambiar la validación de contraseña según el modo (crear vs editar)', () => {
      const passwordControl = component.userForm.get('password');
      fixture.componentRef.setInput('user', null);
      fixture.detectChanges();
      passwordControl?.setValue('');
      expect(passwordControl?.hasError('required')).toBeTruthy();
      fixture.componentRef.setInput('user', createMockUser({ id: '123', firstName: 'Test' }));
      fixture.detectChanges();
      passwordControl?.setValue('');
      expect(passwordControl?.hasError('required')).toBeFalsy();
    });
  });

  describe('Lógica del Submit', () => {
    it('NO debería emitir onSubmit y DEBERÍA mostrar notificación si el form es inválido', () => {
      const emitSpy = jest.spyOn(component.onSubmit, 'emit');
      component.submit();
      expect(emitSpy).not.toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Formulario incorrecto',
        type: NotificationType.ERROR
      }));
      expect(component.userForm.get('firstName')?.touched).toBeTruthy();
      expect(component.userForm.get('idType')?.touched).toBeTruthy();
    });

    it('DEBERÍA emitir onSubmit si el formulario es válido', () => {
      const emitSpy = jest.spyOn(component.onSubmit, 'emit');
      component.userForm.patchValue({
        idType: IdentificationType.CC,
        idNumber: 123456,
        firstName: 'Ana',
        secondName: '',
        lastName: 'Gómez',
        secondLastName: 'López',
        codeNumber: 9876,
        roles: [UserRoleType.ESTUDIANTE],
        email: 'ana@universidad.edu.co',
        password: 'password123'
      })
      component.submit();
      expect(component.userForm.valid).toBeTruthy();
      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Ana',
        email: 'ana@universidad.edu.co',
        roles: [UserRoleType.ESTUDIANTE]
      }));
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });
  });

  describe('Gestión de Roles y Modal', () => {
    it('debería calcular correctamente el fullName para el modal', () => {
      component.userForm.patchValue({ firstName: 'Carlos', lastName: 'Ramírez' });
      expect(component.fullName).toBe('Carlos Ramírez');
    });

    it('debería abrir el modal y preparar los roles actuales', () => {
      component.userForm.controls.roles.setValue([UserRoleType.DIRECTOR]);
      component.openRolesModal();
      expect(component.isRolesModalOpen).toBeTruthy();
      const teacherRole = component.currentRolesForModal.find(role => role.type === UserRoleType.DIRECTOR);
      expect(teacherRole?.assigned).toBeTruthy();
    });

    it('debería guardar los roles actualizados desde el modal', () => {
      const mockUpdatedRoles: UserRole[] = [
        createMockUserRole({ type: UserRoleType.ADMINISTRADOR, assigned: true }),
        createMockUserRole({ type: UserRoleType.ESTUDIANTE, assigned: false })
      ];
      component.handleRolesSaved(mockUpdatedRoles);
      expect(component.isRolesModalOpen).toBeFalsy();
      expect(component.userForm.get('roles')?.value).toEqual([UserRoleType.ADMINISTRADOR]);
    });
  });
});
