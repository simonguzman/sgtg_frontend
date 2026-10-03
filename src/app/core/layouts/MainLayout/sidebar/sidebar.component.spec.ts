import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../../services/auth/auth.service';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';

interface MockAuthService {
  hasAnyRole: jest.Mock<boolean, [UserRoleType[]]>;
}

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mockAuthService: MockAuthService;
  let activeRolesSignal: WritableSignal<UserRoleType[]>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    activeRolesSignal = signal([]);

    mockAuthService = {
      hasAnyRole: jest.fn((allowedRoles: UserRoleType[]) => {
        const currentRoles = activeRolesSignal();
        return allowedRoles.some(role => currentRoles.includes(role));
      })
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Lógica Reactiva (Computed)', () => {
    it('debería crearse el componente', () => {
      expect(component).toBeTruthy();
    });

    it('debería mostrar únicamente los ítems sin restricciones de roles si el usuario no tiene roles (Ej. Invitado/Nuevo)', () => {
      const items = component['menuItems']();
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe('Bandeja de entrada');
      expect(items[1].label).toBe('Historial');
    });

    it('debería mostrar opciones administrativas si el usuario tiene el rol ADMINISTRADOR', () => {
      activeRolesSignal.set([UserRoleType.ADMINISTRADOR]);
      fixture.detectChanges();
      const items = component['menuItems']();
      const labels = items.map(i => i.label);
      expect(labels).toContain('Usuarios');
      expect(labels).toContain('Estadísticas');
      expect(labels).toContain('Propuesta');
      expect(labels).toContain('Bandeja de entrada');
    });

    it('debería mostrar opciones académicas si el usuario es ESTUDIANTE', () => {
      activeRolesSignal.set([UserRoleType.ESTUDIANTE]);
      fixture.detectChanges();
      const items = component['menuItems']();
      const labels = items.map(i => i.label);
      expect(labels).toContain('Propuesta');
      expect(labels).toContain('Anteproyecto');
      expect(labels).toContain('Trabajo de grado');
      expect(labels).not.toContain('Usuarios');
      expect(labels).not.toContain('Estadísticas');
    });
  });

  describe('Renderizado del DOM', () => {
    it('debería renderizar la cantidad correcta de elementos <li> según los permisos', () => {
      activeRolesSignal.set([UserRoleType.ADMINISTRADOR]);
      fixture.detectChanges();      const listItems = fixture.debugElement.queryAll(By.css('li'));
      expect(listItems).toHaveLength(7);
    });

    it('debería renderizar correctamente el icono, el texto y el routerLink en el HTML', () => {
      activeRolesSignal.set([]);
      fixture.detectChanges();
      const anchorElements = fixture.debugElement.queryAll(By.css('a.menu-link'));
      expect(anchorElements).toHaveLength(2);
      const firstItem = anchorElements[0].nativeElement as HTMLElement;
      expect(firstItem.getAttribute('href')).toBe('/notifications');
      const iconSpan = firstItem.querySelector('.material-symbols-outlined');
      const textSpan = firstItem.querySelector('.font-display');
      expect(iconSpan).toBeTruthy();
      expect(iconSpan?.textContent?.trim()).toBe('inbox');
      expect(textSpan).toBeTruthy();
      expect(textSpan?.textContent?.trim()).toBe('Bandeja de entrada');
    });
  });
});
