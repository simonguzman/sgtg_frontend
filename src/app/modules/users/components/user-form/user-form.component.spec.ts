import { ContractType } from '../../enum/contract-type.enum';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { of, throwError } from 'rxjs';
import { CatalogApiService } from '../../../../core/services/catalog/catalog-api.service';
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
import { CatalogSelectionModalComponent } from '../../../../shared/components/modals/catalog-selection-modal/catalog-selection-modal.component';
import { CatalogItem } from '../../interfaces/catalog-item.interface';
import { AuthStorageService } from '../../../../core/services/auth/auth-storage.service';

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

@Component({ selector: 'app-catalog-selection-modal', standalone: true, template: '' })
class MockCatalogSelectionModalComponent {
  @Input() isOpen!: boolean;
  @Input() title!: string;
  @Input() itemName!: string;
  @Input() items!: CatalogItem[];
  @Input() selectedId!: number | null;
  @Input() isCreating!: boolean;
  @Input() allowCreate!: boolean;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSaved = new EventEmitter<number>();
  @Output() onCreate = new EventEmitter<string>();
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
    error: jest.Mock<void, [string, string]>;
  };
  let mockCatalogApi: {
    getDepartments: jest.Mock;
    getPrograms: jest.Mock;
    createDepartment: jest.Mock;
    createProgram: jest.Mock;
  };
  const SISTEMAS = { id: 1, name: 'Sistemas' };
  const ING_SISTEMAS = { id: 7, name: 'Ingeniería de Sistemas' };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockNotificationService = {
      show: jest.fn(),
      error: jest.fn()
    };
    mockCatalogApi = {
      getDepartments: jest.fn(() => of([SISTEMAS])),
      getPrograms: jest.fn(() => of([ING_SISTEMAS])),
      createDepartment: jest.fn((name: string) => of({ id: 2, name })),
      createProgram: jest.fn((name: string) => of({ id: 8, name }))
    };

    await TestBed.configureTestingModule({
      imports: [UserFormComponent, ReactiveFormsModule],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: CatalogApiService, useValue: mockCatalogApi }
      ]
    })
    .overrideComponent(UserFormComponent, {
      remove: { imports: [ButtonComponent, RolesSelectionModalComponent, CatalogSelectionModalComponent] },
      add: { imports: [MockButtonComponent, MockRolesSelectionModalComponent, MockCatalogSelectionModalComponent] }
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

    it('debería exigir la política de contraseñas del backend', () => {
      const passwordControl = component.userForm.get('password');
      passwordControl?.setValue('12345678');
      expect(passwordControl?.hasError('passwordPolicy')).toBeTruthy();
      passwordControl?.setValue('Clave123*');
      expect(passwordControl?.valid).toBeTruthy();
    });

    it('debería rechazar una contraseña con el correo o el documento escritos en el formulario', () => {
      component.userForm.patchValue({ email: 'ana.gomez@unicauca.edu.co', idNumber: 1061234567 });
      const passwordControl = component.userForm.get('password');
      passwordControl?.setValue('Ana.Gomez1*');
      expect(passwordControl?.hasError('passwordPredecible')).toBeTruthy();
      passwordControl?.setValue('Doc1061234567*');
      expect(passwordControl?.hasError('passwordPredecible')).toBeTruthy();
    });

    it('debería cargar los departamentos y programas del backend', () => {
      expect(component.departments()).toEqual([SISTEMAS]);
      expect(component.programs()).toEqual([ING_SISTEMAS]);
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
      // La contraseña nunca se precarga
      expect(component.userForm.get('password')?.value).toBe('');
    });

    it('debería precargar el perfil y aceptar el tipo de documento como clave', () => {
      fixture.componentRef.setInput('user', createMockUser({
        idType: 'PASAPORTE', roles: [UserRoleType.DIRECTOR], department: SISTEMAS
      }));
      fixture.detectChanges();
      expect(component.userForm.get('idType')?.value).toBe(IdentificationType.PASAPORTE);
      expect(component.userForm.get('departmentId')?.value).toBe(1);
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
        password: 'Clave123*',
        programId: 7
      })
      component.submit();
      expect(component.userForm.valid).toBeTruthy();
      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Ana',
        email: 'ana@universidad.edu.co',
        roles: [UserRoleType.ESTUDIANTE],
        program: ING_SISTEMAS,
        department: null
      }));
      expect(emitSpy.mock.calls[0][0]).not.toHaveProperty('programId');
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });
  });

  describe('Perfil académico según los roles', () => {
    it('cualquier rol de perfil docente exige tipo de vinculación y departamento', () => {
      for (const roles of [[UserRoleType.DOCENTE], [UserRoleType.DIRECTOR], [UserRoleType.CODIRECTOR],
        [UserRoleType.EVALUADOR], [UserRoleType.JURADO], [UserRoleType.JURADO_COORDINADOR], [UserRoleType.JEFE_DEP]]) {
        component.userForm.controls.roles.setValue(roles);
        expect(component.showDepartment).toBe(true);
        expect(component.userForm.get('contractType')?.hasError('required')).toBe(true);
        expect(component.userForm.get('departmentId')?.hasError('required')).toBe(true);
      }
    });

    it('ofrece las vinculaciones del negocio sin valor por defecto', () => {
      expect(component.contractTypes.map(c => c.value)).toEqual([ContractType.PLANTA, ContractType.OCASIONAL,
        ContractType.CATEDRA, ContractType.ESTUDIANTE_POSGRADO]);
      expect(component.contractTypes.map(c => c.label)).toEqual(['De planta', 'Ocasional', 'Cátedra',
        'Estudiante de posgrado']);
      expect(component.userForm.get('contractType')?.value).toBeNull();
    });

    it('si no es de planta avisa que al dirigir necesita un codirector de planta', () => {
      component.userForm.controls.roles.setValue([UserRoleType.DOCENTE]);
      component.userForm.controls.contractType.setValue(ContractType.CATEDRA);
      expect(component.requiresCodirectorNotice).toBe(true);
      component.userForm.controls.contractType.setValue(ContractType.PLANTA);
      expect(component.requiresCodirectorNotice).toBe(false);
    });

    it('sin roles de perfil docente no se piden vinculación ni departamento', () => {
      component.userForm.controls.roles.setValue([UserRoleType.CONSEJO]);
      expect(component.showDepartment).toBe(false);
      expect(component.userForm.get('contractType')?.hasError('required')).toBe(false);
      expect(component.userForm.get('departmentId')?.hasError('required')).toBe(false);
    });

    it('un estudiante exige programa', () => {
      component.userForm.controls.roles.setValue([UserRoleType.ESTUDIANTE]);
      expect(component.showProgram).toBe(true);
      expect(component.userForm.get('programId')?.hasError('required')).toBe(true);
    });

    it('agrega un departamento al catálogo sin cambiar la selección hasta guardar en el modal', () => {
      component.addDepartment('  Telemática ');
      expect(mockCatalogApi.createDepartment).toHaveBeenCalledWith('Telemática');
      expect(component.departments()).toContainEqual({ id: 2, name: 'Telemática' });
      expect(component.userForm.get('departmentId')?.value).toBeNull();
      expect(component.isCreatingCatalogItem()).toBe(false);
    });

    it('si el backend rechaza el departamento avisa el error', () => {
      mockCatalogApi.createDepartment.mockReturnValue(throwError(() => new Error('406')));
      component.addDepartment('Sistemas');
      expect(mockNotificationService.error).toHaveBeenCalledWith('No se creó el departamento', expect.any(String));
      expect(component.departments()).toEqual([SISTEMAS]);
      expect(component.isCreatingCatalogItem()).toBe(false);
    });

    it('agrega un programa al catálogo adscrito al departamento elegido', () => {
      component.newProgramDepartmentId = SISTEMAS.id;
      component.addProgram('Ingeniería Electrónica');
      expect(mockCatalogApi.createProgram).toHaveBeenCalledWith('Ingeniería Electrónica', SISTEMAS.id);
      expect(component.programs()).toContainEqual({ id: 8, name: 'Ingeniería Electrónica' });
    });

    it('sin departamento no crea el programa y lo avisa', () => {
      component.addProgram('Ingeniería Electrónica');
      expect(mockCatalogApi.createProgram).not.toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith('No se creó el programa',
        'Seleccione el departamento del programa.');
    });

    it('no agrega catálogos con nombre vacío', () => {
      component.addProgram('   ');
      expect(mockCatalogApi.createProgram).not.toHaveBeenCalled();
    });
  });

  describe('Modales de departamento y programa', () => {
    it('muestra el nombre del departamento y del programa elegidos', () => {
      expect(component.selectedDepartmentName).toBe('');
      component.userForm.patchValue({ departmentId: 1, programId: 7 });
      expect(component.selectedDepartmentName).toBe('Sistemas');
      expect(component.selectedProgramName).toBe('Ingeniería de Sistemas');
    });

    it('al guardar en el modal deja el elemento seleccionado y marcado como tocado', () => {
      component.handleDepartmentSaved(1);
      component.handleProgramSaved(7);
      expect(component.userForm.get('departmentId')?.value).toBe(1);
      expect(component.userForm.get('departmentId')?.touched).toBe(true);
      expect(component.userForm.get('programId')?.value).toBe(7);
      expect(component.userForm.get('programId')?.touched).toBe(true);
    });

    it('el campo de departamento abre su modal', () => {
      component.userForm.controls.roles.setValue([UserRoleType.DOCENTE]);
      fixture.detectChanges();
      fixture.nativeElement.querySelector('#departmentBtn').click();
      expect(component.isDepartmentModalOpen).toBe(true);
    });

    it('muestra un solo ícono: el ⊕ hasta que el campo es válido y luego el ✓ en su lugar', () => {
      const contenedorRol = () => fixture.nativeElement.querySelector('#rolesBtn').parentElement as HTMLElement;
      expect(contenedorRol().querySelector('.add-circle')).toBeTruthy();
      expect(contenedorRol().querySelector('.success-icon')).toBeNull();

      component.handleRolesSaved([createMockUserRole({ type: UserRoleType.CONSEJO, assigned: true })]);
      fixture.detectChanges();
      expect(contenedorRol().querySelector('.add-circle')).toBeNull();
      expect(contenedorRol().querySelector('.success-icon')).toBeTruthy();
    });

    it('el tipo de documento válido cambia la flecha por el ✓', () => {
      const contenedor = () => fixture.nativeElement.querySelector('#idType').parentElement as HTMLElement;
      expect(contenedor().querySelector('.select-arrow')).toBeTruthy();
      component.userForm.controls.idType.setValue(IdentificationType.CC);
      component.userForm.controls.idType.markAsTouched();
      fixture.detectChanges();
      expect(contenedor().querySelector('.select-arrow')).toBeNull();
      expect(contenedor().querySelector('.success-icon')).toBeTruthy();
    });

    it('si la vinculación no es de planta muestra el aviso del codirector', () => {
      component.userForm.controls.roles.setValue([UserRoleType.DOCENTE]);
      component.userForm.controls.contractType.setValue(ContractType.CATEDRA);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-inline-notice')?.textContent).toContain('codirector de planta');

      component.userForm.controls.contractType.setValue(ContractType.PLANTA);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-inline-notice')).toBeNull();
    });

    it('el campo de programa abre su modal', () => {
      component.userForm.controls.roles.setValue([UserRoleType.ESTUDIANTE]);
      fixture.detectChanges();
      fixture.nativeElement.querySelector('#programBtn').click();
      expect(component.isProgramModalOpen).toBe(true);
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
  describe('Gestión por el jefe de departamento', () => {
    beforeEach(() => {
      TestBed.inject(AuthStorageService).setUser(createMockUser({
        id: 'jefe', roles: [UserRoleType.JEFE_DEP, UserRoleType.DOCENTE], department: SISTEMAS
      }));
      component.departments.set([SISTEMAS, { id: 2, name: 'Telemática' }]);
      component.programs.set([{ ...ING_SISTEMAS, parentId: 1 }, { id: 9, name: 'Ingeniería Telemática', parentId: 2 }]);
    });

    afterEach(() => TestBed.inject(AuthStorageService).clearUser());

    it('solo elige su departamento y los programas de ese departamento, y no crea catálogos', () => {
      expect(component.availableDepartments().map(department => department.id)).toEqual([1]);
      expect(component.availablePrograms().map(program => program.id)).toEqual([7]);
      expect(component.canCreateCatalogItems()).toBe(false);
    });

    it('solo asigna o quita Estudiante y Docente; los demás roles quedan bloqueados', () => {
      component.userForm.controls.roles.setValue([UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);
      component.openRolesModal();
      const asignables = component.currentRolesForModal.filter(role => !role.locked).map(role => role.type);
      expect(asignables).toEqual([UserRoleType.DOCENTE, UserRoleType.ESTUDIANTE]);
      // El rol que ya tiene se conserva aunque no lo pueda quitar
      expect(component.currentRolesForModal.find(role => role.type === UserRoleType.DIRECTOR))
        .toEqual({ type: UserRoleType.DIRECTOR, assigned: true, locked: true });
    });
  });

  it('el ojo del campo de contraseña la muestra u oculta', () => {
    const campo = () => fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    expect(campo().type).toBe('password');
    component.togglePassword();
    fixture.detectChanges();
    expect(campo().type).toBe('text');
  });
});
