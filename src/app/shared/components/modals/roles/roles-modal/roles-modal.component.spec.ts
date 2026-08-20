import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { RolesModalComponent } from './roles-modal.component';
import { UserRoleType } from './../../../../../core/enums/user-role-type.enum';
import { UserRole } from '../../../../../core/models/user-role';
import { RolesSelectionModalComponent } from '../roles-selection-modal/roles-selection-modal.component';
import { RolesViewModalComponent } from '../roles-view-modal/roles-view-modal.component';

describe('RolesModalComponent', () => {
  let component: RolesModalComponent;
  let fixture: ComponentFixture<RolesModalComponent>;

  const mockRoles: UserRole[] = [
    { type: UserRoleType.DIRECTOR, assigned: true },
    { type: UserRoleType.ESTUDIANTE, assigned: false }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesModalComponent, RolesSelectionModalComponent, RolesViewModalComponent],
      providers: [provideNoopAnimations()] // Previene errores con animaciones de PrimeNG
    }).compileComponents();

    fixture = TestBed.createComponent(RolesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Inicialización y Lógica de Estado (Clase)', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería iniciar en modo vista (isEditing = false) por defecto', () => {
      expect(component.isEditing).toBe(false);
    });

    it('debería actualizar el estado isEditing al llamar a toggleEditing()', () => {
      component.toggleEditing(true);
      expect(component.isEditing).toBe(true);

      component.toggleEditing(false);
      expect(component.isEditing).toBe(false);
    });

    it('debería emitir isOpenChange(false) y resetear isEditing al llamar a closeAll()', () => {
      const spyOpenChange = jest.spyOn(component.isOpenChange, 'emit');
      component.isEditing = true;

      component.closeAll();

      expect(component.isEditing).toBe(false);
      expect(spyOpenChange).toHaveBeenCalledWith(false);
      expect(spyOpenChange).toHaveBeenCalledTimes(1);
    });

    it('debería emitir onSaved, delegar a closeAll y actualizar estado al llamar a handleSave()', () => {
      const spySaved = jest.spyOn(component.onSaved, 'emit');
      const spyCloseAll = jest.spyOn(component, 'closeAll');

      component.handleSave(mockRoles);

      expect(spySaved).toHaveBeenCalledWith(mockRoles);
      expect(spySaved).toHaveBeenCalledTimes(1);
      expect(spyCloseAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integración con el DOM y Componentes Hijos (@if / @else)', () => {
    it('debería renderizar RolesViewModalComponent y pasarle los inputs correctos cuando isEditing es false', () => {
      component.username = 'Simón Guzmán';
      component.roles = mockRoles;
      component.isOpen = true;
      component.isEditing = false;
      fixture.detectChanges();

      const viewModalDebugEl = fixture.debugElement.query(By.directive(RolesViewModalComponent));
      expect(viewModalDebugEl).toBeTruthy();

      const viewModalInstance = viewModalDebugEl.componentInstance as RolesViewModalComponent;
      expect(viewModalInstance.username).toBe('Simón Guzmán');
      expect(viewModalInstance.roles).toEqual(mockRoles);
      expect(viewModalInstance.isOpen).toBe(true);

      // Verificamos que el componente de selección NO exista en el DOM (gracias al @if)
      const selectionModalDebugEl = fixture.debugElement.query(By.directive(RolesSelectionModalComponent));
      expect(selectionModalDebugEl).toBeNull();
    });

    it('debería cambiar a RolesSelectionModalComponent cuando el componente de vista emite onManage', () => {
      component.isEditing = false;
      fixture.detectChanges();

      const viewModalDebugEl = fixture.debugElement.query(By.directive(RolesViewModalComponent));
      const viewModalInstance = viewModalDebugEl.componentInstance as RolesViewModalComponent;

      // Simulamos que el hijo emite el evento para cambiar de modo
      viewModalInstance.onManage.emit();
      fixture.detectChanges();

      expect(component.isEditing).toBe(true);

      // Ahora el componente de vista no debe existir, y el de selección sí
      expect(fixture.debugElement.query(By.directive(RolesViewModalComponent))).toBeNull();

      const selectionModalDebugEl = fixture.debugElement.query(By.directive(RolesSelectionModalComponent));
      expect(selectionModalDebugEl).toBeTruthy();
    });

    it('debería llamar a handleSave cuando RolesSelectionModalComponent emite onSaved', () => {
      const spyHandleSave = jest.spyOn(component, 'handleSave');

      component.isEditing = true; // Forzamos mostrar el modal de selección
      fixture.detectChanges();

      const selectionModalDebugEl = fixture.debugElement.query(By.directive(RolesSelectionModalComponent));
      const selectionModalInstance = selectionModalDebugEl.componentInstance as RolesSelectionModalComponent;

      // Simulamos que el componente hijo guardó los cambios
      selectionModalInstance.onSaved.emit(mockRoles);
      fixture.detectChanges();

      expect(spyHandleSave).toHaveBeenCalledWith(mockRoles);
    });

    it('debería llamar a closeAll cuando cualquiera de los componentes hijos emite isOpenChange', () => {
      const spyCloseAll = jest.spyOn(component, 'closeAll');

      // Caso 1: Pruebas con el hijo de Vista
      component.isEditing = false;
      fixture.detectChanges();
      const viewModalInstance = fixture.debugElement.query(By.directive(RolesViewModalComponent)).componentInstance as RolesViewModalComponent;

      viewModalInstance.isOpenChange.emit(false);
      expect(spyCloseAll).toHaveBeenCalledTimes(1);

      // Caso 2: Pruebas con el hijo de Selección
      component.isEditing = true;
      fixture.detectChanges();
      const selectionModalInstance = fixture.debugElement.query(By.directive(RolesSelectionModalComponent)).componentInstance as RolesSelectionModalComponent;

      selectionModalInstance.isOpenChange.emit(false);
      expect(spyCloseAll).toHaveBeenCalledTimes(2);
    });
  });
});
