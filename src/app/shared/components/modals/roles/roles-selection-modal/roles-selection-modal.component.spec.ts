import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SimpleChange } from '@angular/core';

import { RolesSelectionModalComponent } from './roles-selection-modal.component';
import { UserRole } from '../../../../../core/models/user-role';
import { UserRoleType } from './../../../../../core/enums/user-role-type.enum';
import { ButtonComponent } from '../../../button-component/button-component.component';

describe('RolesSelectionModalComponent', () => {
  let component: RolesSelectionModalComponent;
  let fixture: ComponentFixture<RolesSelectionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesSelectionModalComponent],
      providers: [provideNoopAnimations()] // Previene bloqueos por animaciones de PrimeNG en los tests
    }).compileComponents();

    fixture = TestBed.createComponent(RolesSelectionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Lógica Interna e Inmutabilidad', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería inicializar editableRoles con todos los valores del Enum si la entrada está vacía', () => {
      component.roles = [];
      component.isOpen = true;

      // Simulamos el ciclo de vida OnChanges de Angular para entradas vacías
      component.ngOnChanges({
        isOpen: new SimpleChange(false, true, true)
      });

      const enumCount = Object.values(UserRoleType).length;
      expect(component.editableRoles).toHaveLength(enumCount);

      // Verificamos que todos estén desasignados por defecto
      const allUnassigned = component.editableRoles.every(r => !r.assigned);
      expect(allUnassigned).toBeTruthy();
    });

    it('debería crear una copia profunda de los roles para no afectar al padre antes de emitir (Inmutabilidad)', () => {
      const mockRoles: UserRole[] = [
        { type: UserRoleType.ADMINISTRADOR, assigned: true }
      ];

      component.roles = mockRoles;
      component.isOpen = true;
      component.initializeRoles();

      // Mutamos el estado dentro del componente modal
      component.toggleRole(component.editableRoles[0]);

      // Verificamos la divergencia de estados
      expect(component.editableRoles[0].assigned).toBe(false);
      expect(mockRoles[0].assigned).toBe(true); // El input original debe permanecer intacto
    });

    it('debería alternar el estado assigned al llamar a toggleRole()', () => {
      const role: UserRole = { type: UserRoleType.ADMINISTRADOR, assigned: false };

      component.toggleRole(role);
      expect(role.assigned).toBeTruthy();

      component.toggleRole(role);
      expect(role.assigned).toBeFalsy();
    });
  });

  describe('Renderizado del DOM e Interacción UI', () => {
    beforeEach(() => {
      // Configuramos un estado inicial con roles mixtos para las pruebas de UI
      component.roles = [
        { type: UserRoleType.ADMINISTRADOR, assigned: true },
        { type: UserRoleType.DIRECTOR, assigned: false }
      ];
      component.isOpen = true;

      // Ejecutamos ngOnChanges manualmente como lo haría Angular al recibir @Inputs nuevos
      component.ngOnChanges({ isOpen: new SimpleChange(false, true, true) });
      fixture.detectChanges();
    });

    it('debería renderizar los botones de cada rol con las etiquetas y variantes correctas según su estado', () => {
      const buttonDebugElements = fixture.debugElement.queryAll(By.directive(ButtonComponent));

      // Filtramos para obtener solo los botones asociados a la lista de roles (ignoramos Guardar/Salir)
      const roleButtons = buttonDebugElements
        .map(el => el.componentInstance as ButtonComponent)
        .filter(btn => btn.label === 'Deshabilitar rol' || btn.label === 'Asignar rol');

      expect(roleButtons).toHaveLength(2);

      // El administrador está asignado (true) -> debe ofrecer 'Deshabilitar' con variante 'secondary'
      expect(roleButtons[0].label).toBe('Deshabilitar rol');
      expect(roleButtons[0].variant).toBe('secondary');

      // El director NO está asignado (false) -> debe ofrecer 'Asignar' con variante 'primary'
      expect(roleButtons[1].label).toBe('Asignar rol');
      expect(roleButtons[1].variant).toBe('primary');
    });

    it('debería ejecutar toggleRole al hacer clic en el botón de un rol específico', () => {
      const toggleRoleSpy = jest.spyOn(component, 'toggleRole');

      // Buscamos el primer botón de rol (el del Administrador)
      const buttonDebugEl = fixture.debugElement.queryAll(By.directive(ButtonComponent))[0];
      const buttonInstance = buttonDebugEl.componentInstance as ButtonComponent;

      buttonInstance.onClick.emit();

      expect(toggleRoleSpy).toHaveBeenCalledTimes(1);
      expect(toggleRoleSpy).toHaveBeenCalledWith(component.editableRoles[0]);
    });

    it('debería emitir onSaved con los cambios y cerrar el modal al hacer clic en "Guardar"', () => {
      const onSaveSpy = jest.spyOn(component.onSaved, 'emit');
      const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');

      // Buscamos el botón de guardar por su propiedad label
      const buttonDebugElements = fixture.debugElement.queryAll(By.directive(ButtonComponent));
      const saveBtnElement = buttonDebugElements.find(el => el.componentInstance.label === 'Guardar');

      expect(saveBtnElement).toBeTruthy();

      // Disparamos el click
      (saveBtnElement!.componentInstance as ButtonComponent).onClick.emit();

      expect(onSaveSpy).toHaveBeenCalledTimes(1);
      expect(onSaveSpy).toHaveBeenCalledWith(component.editableRoles);
      expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
    });

    it('debería cerrar el modal sin guardar al hacer clic en "Salir"', () => {
      const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');
      const onSaveSpy = jest.spyOn(component.onSaved, 'emit');

      // Buscamos el botón de salir por su propiedad label
      const buttonDebugElements = fixture.debugElement.queryAll(By.directive(ButtonComponent));
      const exitBtnElement = buttonDebugElements.find(el => el.componentInstance.label === 'Salir');

      expect(exitBtnElement).toBeTruthy();

      // Disparamos el click
      (exitBtnElement!.componentInstance as ButtonComponent).onClick.emit();

      // Debe emitir el cierre pero NUNCA el guardado
      expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
      expect(onSaveSpy).not.toHaveBeenCalled();
    });
  });
});
