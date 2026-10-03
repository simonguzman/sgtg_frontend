import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RolesModalComponent } from './roles-modal.component';
import { UserRoleType } from './../../../../../core/enums/user-role-type.enum';
import { UserRole } from '../../../../../core/models/user-role';
import { RolesSelectionModalComponent } from '../roles-selection-modal/roles-selection-modal.component';
import { RolesViewModalComponent } from '../roles-view-modal/roles-view-modal.component';
@Component({ selector: 'app-roles-view-modal', standalone: true, template: '' })
class MockRolesViewModalComponent {
  @Input() isOpen = false;
  @Input() username = '';
  @Input() roles: UserRole[] = [];
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onManage = new EventEmitter<void>();
}

@Component({ selector: 'app-roles-selection-modal', standalone: true, template: '' })
class MockRolesSelectionModalComponent {
  @Input() isOpen = false;
  @Input() roles: UserRole[] = [];
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSaved = new EventEmitter<UserRole[]>();
}

const createMockUserRole = (overrides: Partial<UserRole> = {}): UserRole => ({
  type: UserRoleType.DIRECTOR,
  assigned: true,
  ...overrides
});

describe('RolesModalComponent', () => {
  let component: RolesModalComponent;
  let fixture: ComponentFixture<RolesModalComponent>;
  const mockRoles: UserRole[] = [
    createMockUserRole({ type: UserRoleType.DIRECTOR, assigned: true }),
    createMockUserRole({ type: UserRoleType.ESTUDIANTE, assigned: false })
  ];

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [RolesModalComponent]
    })
    .overrideComponent(RolesModalComponent, {
      remove: {
        imports: [RolesViewModalComponent, RolesSelectionModalComponent]
      },
      add: {
        imports: [MockRolesViewModalComponent, MockRolesSelectionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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
    it('debería renderizar MockRolesViewModalComponent y pasarle los inputs correctos cuando isEditing es false', () => {
      fixture.componentRef.setInput('username', 'Simón Guzmán');
      fixture.componentRef.setInput('roles', mockRoles);
      fixture.componentRef.setInput('isOpen', true);
      component.isEditing = false;
      fixture.detectChanges();
      const viewModalDebugEl = fixture.debugElement.query(By.directive(MockRolesViewModalComponent));
      expect(viewModalDebugEl).toBeTruthy();
      const viewModalInstance = viewModalDebugEl.componentInstance as MockRolesViewModalComponent;
      expect(viewModalInstance.username).toBe('Simón Guzmán');
      expect(viewModalInstance.roles).toEqual(mockRoles);
      expect(viewModalInstance.isOpen).toBe(true);
      const selectionModalDebugEl = fixture.debugElement.query(By.directive(MockRolesSelectionModalComponent));
      expect(selectionModalDebugEl).toBeNull();
    });

    it('debería cambiar a MockRolesSelectionModalComponent cuando el componente de vista emite onManage', () => {
      component.isEditing = false;
      fixture.detectChanges();
      const viewModalDebugEl = fixture.debugElement.query(By.directive(MockRolesViewModalComponent));
      const viewModalInstance = viewModalDebugEl.componentInstance as MockRolesViewModalComponent;
      viewModalInstance.onManage.emit();
      fixture.detectChanges();
      expect(component.isEditing).toBe(true);
      expect(fixture.debugElement.query(By.directive(MockRolesViewModalComponent))).toBeNull();
      const selectionModalDebugEl = fixture.debugElement.query(By.directive(MockRolesSelectionModalComponent));
      expect(selectionModalDebugEl).toBeTruthy();
    });

    it('debería llamar a handleSave cuando MockRolesSelectionModalComponent emite onSaved', () => {
      const spyHandleSave = jest.spyOn(component, 'handleSave');
      component.isEditing = true;
      fixture.detectChanges();
      const selectionModalDebugEl = fixture.debugElement.query(By.directive(MockRolesSelectionModalComponent));
      const selectionModalInstance = selectionModalDebugEl.componentInstance as MockRolesSelectionModalComponent;
      selectionModalInstance.onSaved.emit(mockRoles);
      fixture.detectChanges();
      expect(spyHandleSave).toHaveBeenCalledWith(mockRoles);
    });

    it('debería llamar a closeAll cuando cualquiera de los componentes hijos emite isOpenChange', () => {
      const spyCloseAll = jest.spyOn(component, 'closeAll');
      component.isEditing = false;
      fixture.detectChanges();
      const viewModalInstance = fixture.debugElement.query(By.directive(MockRolesViewModalComponent)).componentInstance as MockRolesViewModalComponent;
      viewModalInstance.isOpenChange.emit(false);
      expect(spyCloseAll).toHaveBeenCalledTimes(1);

      component.isEditing = true;
      fixture.detectChanges();
      const selectionModalInstance = fixture.debugElement.query(By.directive(MockRolesSelectionModalComponent)).componentInstance as MockRolesSelectionModalComponent;
      selectionModalInstance.isOpenChange.emit(false);
      expect(spyCloseAll).toHaveBeenCalledTimes(2);
    });
  });
});
