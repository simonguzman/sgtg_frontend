import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { RolesViewModalComponent } from './roles-view-modal.component';
import { UserRole } from './../../../../../core/models/user-role';
import { UserRoleType } from './../../../../../core/enums/user-role-type.enum';
import { ButtonComponent } from '../../../button-component/button-component.component';

describe('RolesViewModalComponent', () => {
  let component: RolesViewModalComponent;
  let fixture: ComponentFixture<RolesViewModalComponent>;

  // Datos de prueba tipados estrictamente
  const mockRoles: UserRole[] = [
    { type: UserRoleType.ADMINISTRADOR, assigned: true },
    { type: UserRoleType.DIRECTOR, assigned: false },
    { type: UserRoleType.ASESOR, assigned: true }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesViewModalComponent],
      // provideNoopAnimations es crucial para que p-dialog no bloquee el test con animaciones asíncronas
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(RolesViewModalComponent);
    component = fixture.componentInstance;
  });

  describe('Inicialización y Lógica Interna', () => {
    it('debería crearse correctamente', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('debería filtrar y devolver solo los roles con assigned: true en el getter activeRoles', () => {
      component.roles = mockRoles;
      fixture.detectChanges();

      const active = component.activeRoles;

      expect(active).toHaveLength(2);
      expect(active[0].type).toBe(UserRoleType.ADMINISTRADOR);
      expect(active[1].type).toBe(UserRoleType.ASESOR);
    });
  });

  describe('Renderizado del DOM', () => {
    beforeEach(() => {
      // Configuramos el estado necesario para que el modal de PrimeNG renderice el contenido
      component.isOpen = true;
      component.username = 'simonguzman';
      component.roles = mockRoles;
      fixture.detectChanges();
    });

    it('debería mostrar el nombre de usuario en el título del modal', () => {
      const headerTitle = fixture.debugElement.query(By.css('h2.text-primary')).nativeElement as HTMLElement;
      expect(headerTitle.textContent).toContain('Roles asignados a simonguzman');
    });

    it('debería renderizar en la lista únicamente los roles activos', () => {
      const listItems = fixture.debugElement.queryAll(By.css('ul.list-none li'));

      // De los 3 roles en mockRoles, solo 2 están asignados (true)
      expect(listItems).toHaveLength(2);

      // Verificamos que el contenido del primer elemento corresponda al primer rol activo
      const firstItemText = (listItems[0].nativeElement as HTMLElement).textContent;
      expect(firstItemText).toContain(UserRoleType.ADMINISTRADOR);
      expect(firstItemText).toContain('Activo');
    });
  });

  describe('Interacción y Emisión de Eventos (Outputs)', () => {
    it('debería emitir onManage al presionar el componente botón de Gestionar', () => {
      component.isOpen = true;
      fixture.detectChanges();

      const onManageSpy = jest.spyOn(component.onManage, 'emit');

      // Buscamos la instancia del componente hijo (ButtonComponent)
      const buttonDebugEl = fixture.debugElement.query(By.directive(ButtonComponent));
      expect(buttonDebugEl).toBeTruthy();

      // Simulamos que el hijo emite su output 'onClick'
      const buttonInstance = buttonDebugEl.componentInstance as ButtonComponent;
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
