import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../../services/auth/auth.service';
// Importamos el enum directamente para tipar estrictamente nuestro mock
import { UserRoleType } from '../../../../core/enums/user-role-type.enum'; // Ajusta la ruta a tu estructura real si es diferente

// Definimos una interfaz estricta para nuestro mock, sin usar 'any'
interface MockAuthService {
  hasAnyRole: jest.Mock<boolean, [UserRoleType[]]>;
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  let mockAuthService: MockAuthService;

  // Usamos este Signal para controlar qué roles tiene el usuario simulado.
  // Al leerlo dentro de hasAnyRole, vinculamos el computed() del componente a este estado.
  let activeRolesSignal: WritableSignal<UserRoleType[]>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante warnings del Router en JSDOM
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos al usuario sin roles (por defecto)
    activeRolesSignal = signal([]);

    mockAuthService = {
      // Simulamos la lógica del servicio leyendo el signal local
      hasAnyRole: jest.fn((allowedRoles: UserRoleType[]) => {
        const currentRoles = activeRolesSignal(); // El computed() registrará esta dependencia
        return allowedRoles.some(role => currentRoles.includes(role));
      })
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]), // Proveemos el enrutador para que [routerLink] no falle
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Ejecuta el primer renderizado y evalúa el computed
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Lógica Reactiva (Computed)', () => {
    it('debería crearse el componente', () => {
      expect(component).toBeTruthy();
    });

    it('debería mostrar únicamente los ítems sin restricciones de roles si el usuario no tiene roles (Ej. Invitado/Nuevo)', () => {
      // activeRolesSignal está vacío por defecto
      const items = component['menuItems']();

      expect(items).toHaveLength(2);
      expect(items[0].label).toBe('Bandeja de entrada');
      expect(items[1].label).toBe('Historial');
    });

    it('debería mostrar opciones administrativas si el usuario tiene el rol ADMINISTRADOR', () => {
      // Cambiamos el estado reactivo, lo que debe forzar la reevaluación de menuItems()
      activeRolesSignal.set([UserRoleType.ADMINISTRADOR]);
      fixture.detectChanges();

      const items = component['menuItems']();
      const labels = items.map(i => i.label);

      // Un administrador debería ver Propuesta, Usuarios, Estadísticas y los ítems libres
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
      expect(labels).not.toContain('Usuarios'); // No es admin
      expect(labels).not.toContain('Estadísticas'); // No es admin ni consejo
    });
  });

  describe('Renderizado del DOM', () => {
    it('debería renderizar la cantidad correcta de elementos <li> según los permisos', () => {
      activeRolesSignal.set([UserRoleType.ADMINISTRADOR]);
      fixture.detectChanges(); // Actualiza la vista

      // El Administrador está incluido en todos los ítems restringidos más los ítems libres (7 en total)
      const listItems = fixture.debugElement.queryAll(By.css('li'));
      expect(listItems).toHaveLength(7);
    });

    it('debería renderizar correctamente el icono, el texto y el routerLink en el HTML', () => {
      activeRolesSignal.set([]); // Sin roles, solo "Bandeja" e "Historial"
      fixture.detectChanges();

      const anchorElements = fixture.debugElement.queryAll(By.css('a.menu-link'));
      expect(anchorElements).toHaveLength(2);

      const firstItem = anchorElements[0].nativeElement as HTMLElement;

      // Verificamos atributos del enrutador nativo
      expect(firstItem.getAttribute('href')).toBe('/notifications');

      // Verificamos el contenido visual (icono y texto) con encadenamiento opcional para prevenir crash
      const iconSpan = firstItem.querySelector('.material-symbols-outlined');
      const textSpan = firstItem.querySelector('.font-display');

      expect(iconSpan).toBeTruthy();
      expect(iconSpan?.textContent?.trim()).toBe('inbox');

      expect(textSpan).toBeTruthy();
      expect(textSpan?.textContent?.trim()).toBe('Bandeja de entrada');
    });
  });
});
