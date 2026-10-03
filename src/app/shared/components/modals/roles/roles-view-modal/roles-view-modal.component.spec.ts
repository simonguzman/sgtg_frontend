import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RolesViewModalComponent } from './roles-view-modal.component';
import { UserRole } from './../../../../../core/models/user-role';
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
  assigned: true,
  ...overrides
});

describe('RolesViewModalComponent', () => {
  let component: RolesViewModalComponent;
  let fixture: ComponentFixture<RolesViewModalComponent>;
  const mockRoles: UserRole[] = [
    createMockUserRole({ type: UserRoleType.ADMINISTRADOR, assigned: true }),
    createMockUserRole({ type: UserRoleType.DIRECTOR, assigned: false }),
    createMockUserRole({ type: UserRoleType.ASESOR, assigned: true })
  ];

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [RolesViewModalComponent],
      providers: [provideNoopAnimations()]
    })
    .overrideComponent(RolesViewModalComponent, {
      remove: {
        imports: [ButtonComponent]
      },
      add: {
        imports: [MockButtonComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesViewModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Lógica Interna', () => {
    it('debería crearse correctamente', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('debería filtrar y devolver solo los roles con assigned: true en el getter activeRoles', () => {
      fixture.componentRef.setInput('roles', mockRoles);
      fixture.detectChanges();
      const active = component.activeRoles;
      expect(active).toHaveLength(2);
      expect(active[0].type).toBe(UserRoleType.ADMINISTRADOR);
      expect(active[1].type).toBe(UserRoleType.ASESOR);
    });
  });

  describe('Renderizado del DOM', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('username', 'simonguzman');
      fixture.componentRef.setInput('roles', mockRoles);
      fixture.detectChanges();
    });

    it('debería mostrar el nombre de usuario en el título del modal', () => {
      const headerTitle = fixture.debugElement.query(By.css('h2.text-primary')).nativeElement as HTMLElement;
      expect(headerTitle.textContent).toContain('Roles asignados a simonguzman');
    });

    it('debería renderizar en la lista únicamente los roles activos', () => {
      const listItems = fixture.debugElement.queryAll(By.css('ul.list-none li'));
      expect(listItems).toHaveLength(2);
      const firstItemText = (listItems[0].nativeElement as HTMLElement).textContent;
      expect(firstItemText).toContain(UserRoleType.ADMINISTRADOR);
      expect(firstItemText).toContain('Activo');
    });
  });

  describe('Interacción y Emisión de Eventos (Outputs)', () => {
    it('debería emitir onManage al presionar el componente botón de Gestionar', () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const onManageSpy = jest.spyOn(component.onManage, 'emit');
      const buttonDebugEl = fixture.debugElement.query(By.directive(MockButtonComponent));
      expect(buttonDebugEl).toBeTruthy();
      const buttonInstance = buttonDebugEl.componentInstance as MockButtonComponent;
      buttonInstance.onClick.emit();
      expect(onManageSpy).toHaveBeenCalledTimes(1);
    });

    it('debería emitir isOpenChange con "false" al ejecutar el método close()', () => {
      const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');
      component.close();
      expect(isOpenChangeSpy).toHaveBeenCalledTimes(1);
      expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
    });
  });
});
