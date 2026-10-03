import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RolesSelectionModalComponent } from './roles-selection-modal.component';
import { UserRole } from '../../../../../core/models/user-role';
import { UserRoleType } from './../../../../../core/enums/user-role-type.enum';
import { ButtonComponent } from '../../../button-component/button-component.component';

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}

const createMockUserRole = (overrides: Partial<UserRole> = {}): UserRole => ({
  type: UserRoleType.ADMINISTRADOR,
  assigned: false,
  ...overrides
});

describe('RolesSelectionModalComponent', () => {
  let component: RolesSelectionModalComponent;
  let fixture: ComponentFixture<RolesSelectionModalComponent>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [RolesSelectionModalComponent],
      providers: [provideNoopAnimations()]
    })
    .overrideComponent(RolesSelectionModalComponent, {
      remove: {
        imports: [ButtonComponent]
      },
      add: {
        imports: [MockButtonComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesSelectionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Lógica Interna e Inmutabilidad', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería inicializar editableRoles con todos los valores del Enum si la entrada está vacía', () => {
      fixture.componentRef.setInput('roles', []);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const enumCount = Object.values(UserRoleType).length;
      expect(component.editableRoles).toHaveLength(enumCount);
      const allUnassigned = component.editableRoles.every(role => !role.assigned);
      expect(allUnassigned).toBeTruthy();
    });

    it('debería crear una copia profunda de los roles para no afectar al padre antes de emitir (Inmutabilidad)', () => {
      const mockRoles: UserRole[] = [
        createMockUserRole({ type: UserRoleType.ADMINISTRADOR, assigned: true })
      ];

      fixture.componentRef.setInput('roles', mockRoles);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      component.toggleRole(component.editableRoles[0]);
      expect(component.editableRoles[0].assigned).toBe(false);
      expect(mockRoles[0].assigned).toBe(true);
    });

    it('debería alternar el estado assigned al llamar a toggleRole()', () => {
      const role = createMockUserRole({ type: UserRoleType.ADMINISTRADOR, assigned: false });
      component.toggleRole(role);
      expect(role.assigned).toBeTruthy();
      component.toggleRole(role);
      expect(role.assigned).toBeFalsy();
    });
  });

  describe('Renderizado del DOM e Interacción UI', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('roles', [
        createMockUserRole({ type: UserRoleType.ADMINISTRADOR, assigned: true }),
        createMockUserRole({ type: UserRoleType.DIRECTOR, assigned: false })
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
    });

    it('debería renderizar los botones de cada rol con las etiquetas y variantes correctas según su estado', () => {
      const buttonDebugElements = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      const roleButtons = buttonDebugElements
        .map(el => el.componentInstance as MockButtonComponent)
        .filter(btn => btn.label === 'Deshabilitar rol' || btn.label === 'Asignar rol');
      expect(roleButtons).toHaveLength(2);
      expect(roleButtons[0].label).toBe('Deshabilitar rol');
      expect(roleButtons[0].variant).toBe('secondary');
      expect(roleButtons[1].label).toBe('Asignar rol');
      expect(roleButtons[1].variant).toBe('primary');
    });

    it('debería ejecutar toggleRole al hacer clic en el botón de un rol específico', () => {
      const toggleRoleSpy = jest.spyOn(component, 'toggleRole');
      const buttonDebugEl = fixture.debugElement.queryAll(By.directive(MockButtonComponent))[0];
      const buttonInstance = buttonDebugEl.componentInstance as MockButtonComponent;
      buttonInstance.onClick.emit();
      expect(toggleRoleSpy).toHaveBeenCalledTimes(1);
      expect(toggleRoleSpy).toHaveBeenCalledWith(component.editableRoles[0]);
    });

    it('debería emitir onSaved con los cambios y cerrar el modal al hacer clic en "Guardar"', () => {
      const onSaveSpy = jest.spyOn(component.onSaved, 'emit');
      const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');
      const buttonDebugElements = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      const saveBtnElement = buttonDebugElements.find(el => el.componentInstance.label === 'Guardar');
      expect(saveBtnElement).toBeTruthy();
      (saveBtnElement!.componentInstance as MockButtonComponent).onClick.emit();
      expect(onSaveSpy).toHaveBeenCalledTimes(1);
      expect(onSaveSpy).toHaveBeenCalledWith(component.editableRoles);
      expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
    });

    it('debería cerrar el modal sin guardar al hacer clic en "Salir"', () => {
      const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');
      const onSaveSpy = jest.spyOn(component.onSaved, 'emit');
      const buttonDebugElements = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      const exitBtnElement = buttonDebugElements.find(element => element.componentInstance.label === 'Salir');
      expect(exitBtnElement).toBeTruthy();
      (exitBtnElement!.componentInstance as MockButtonComponent).onClick.emit();
      expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
      expect(onSaveSpy).not.toHaveBeenCalled();
    });
  });
});
