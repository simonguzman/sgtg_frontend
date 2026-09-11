import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal, WritableSignal, Component, Input } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { InboxService } from '../../../../modules/notifications/services/inbox.service';

import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ChangePasswordModalComponent } from '../../../../shared/components/modals/change-password-modal/change-password-modal.component';

import { User } from '../../../../modules/users/interfaces/user.interface';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserState } from '../../../../modules/users/enum/user-state.enum';

// ── Tipos Seguros para los Mocks (Zero 'any') ───────────────────────────────

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
  logout: jest.Mock<void, []>;
}

interface MockUserService {
  formatFullName: jest.Mock<string, [User]>;
}

interface MockInboxService {
  unreadCount: WritableSignal<number>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
  const baseUser: User = {
    id: '1',
    idType: 'CC',
    idNumber: 1000000000,
    firstName: 'Simón',
    secondName: '',
    lastName: 'Guzmán',
    secondLastName: 'Anaya',
    codeNumber: 1234567890,
    email: 'test@test.com',
    password: '123',
    state: UserState.active,
    // Forzamos el casteo en el array para que coincida con el enum si el test original
    // pasaba strings crudos, pero mantenemos la integridad del tipo UserRoleType.
    roles: ['Director', 'Jurado'] as unknown as UserRoleType[]
  };

  return { ...baseUser, ...overrides } as User;
};

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

// 🔥 CORRECCIÓN: Los mocks también deben ser standalone para reemplazar componentes standalone
@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
}

@Component({ selector: 'app-change-password-modal', template: '', standalone: true })
class MockChangePasswordModalComponent {
  @Input() isOpen = false;
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  let mockAuthService: MockAuthService;
  let mockUserService: MockUserService;
  let mockInboxService: MockInboxService;
  let mockRouter: Pick<Router, 'navigate'>;

  const mockUser = createMockUser();

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener la terminal limpia ante warnings
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockAuthService = {
      currentUser: signal<User | null>(mockUser),
      logout: jest.fn()
    };

    mockUserService = {
      formatFullName: jest.fn().mockReturnValue('Simón Guzmán')
    };

    mockInboxService = {
      unreadCount: signal(0)
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: InboxService, useValue: mockInboxService },
        { provide: Router, useValue: mockRouter },
        provideNoopAnimations()
      ]
    })
    .overrideComponent(HeaderComponent, {
      remove: { imports: [ConfirmationActionModalComponent, ChangePasswordModalComponent] },
      add: { imports: [MockConfirmationActionModalComponent, MockChangePasswordModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Propiedades Computadas', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería calcular el nombre de usuario usando UserService si existe sesión', () => {
      // Como formatFullName recibe un User completo, esperamos que se llame con mockUser
      expect(component['userFullName']()).toBe('Simón Guzmán');
      expect(mockUserService.formatFullName).toHaveBeenCalledWith(mockUser);
    });

    it('debería retornar "Invitado" si no hay usuario en sesión', () => {
      mockAuthService.currentUser.set(null);
      fixture.detectChanges();

      expect(component['userFullName']()).toBe('Invitado');
    });

    it('debería formatear correctamente los roles separados por barra', () => {
      expect(component['userRoleLabel']()).toBe('Director / Jurado');
    });

    it('debería manejar usuarios sin roles correctamente', () => {
      // Generamos un nuevo mock sin roles
      const userWithoutRoles = createMockUser({ roles: [] });
      mockAuthService.currentUser.set(userWithoutRoles);

      fixture.detectChanges();

      expect(component['userRoleLabel']()).toBe('');
    });
  });

  describe('Navegación e Interacción de Menús', () => {
    it('debería navegar a notificaciones al ejecutar goToInbox()', () => {
      component.goToInbox();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('debería navegar al perfil al ejecutar goToProfile()', () => {
      component.goToProfile();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users/profile']);
    });

    it('debería alternar el estado isMenuOpen al ejecutar onMenuToggle', () => {
      const mockEvent = new Event('click');
      // Espiamos el ViewChild del menú de PrimeNG
      jest.spyOn(component.menu, 'toggle').mockImplementation();

      expect(component.isMenuOpen()).toBeFalsy();

      component.onMenuToggle(mockEvent);

      expect(component.isMenuOpen()).toBeTruthy();
      expect(component.menu.toggle).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('Flujos de Modales (Logout y Contraseña)', () => {
    it('debería abrir y cancelar el modal de cerrar sesión', () => {
      component.openLogoutModal();
      expect(component.isLogoutModal()).toBeTruthy();

      component.cancelLogout();
      expect(component.isLogoutModal()).toBeFalsy();
    });

    it('debería ejecutar el flujo completo de cierre de sesión exitosamente', () => {
      component.openLogoutModal();
      component.confirmLogout();

      expect(component.isLogoutModal()).toBeFalsy();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('debería abrir y cerrar el modal de cambio de contraseña', () => {
      component.openChangePasswordModal();
      expect(component.isChangePasswordModal()).toBeTruthy();

      component.closeChangePasswordModal();
      expect(component.isChangePasswordModal()).toBeFalsy();
    });
  });

  describe('Renderizado del DOM', () => {
    it('no debería renderizar el badge de notificaciones si el conteo es 0', () => {
      mockInboxService.unreadCount.set(0);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bg-\\[\\#DB141C\\]');
      expect(badge).toBeNull();
    });

    it('debería renderizar el badge con el número exacto si es entre 1 y 9', () => {
      mockInboxService.unreadCount.set(5);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bg-\\[\\#DB141C\\]');
      // Usamos encadenamiento opcional para evitar crash si el selector falla
      expect(badge?.textContent?.trim()).toBe('5');
    });

    it('debería renderizar "9+" en el badge si hay más de 9 notificaciones', () => {
      mockInboxService.unreadCount.set(12);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bg-\\[\\#DB141C\\]');
      expect(badge?.textContent?.trim()).toBe('9+');
    });
  });
});
