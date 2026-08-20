import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { InboxService } from '../../../../modules/notifications/services/inbox.service';
import { Router } from '@angular/router';
import { signal, WritableSignal, Component, Input } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ChangePasswordModalComponent } from '../../../../shared/components/modals/change-password-modal/change-password-modal.component';

// 1. Mocks de Componentes Hijos (Para aislar la prueba y evitar dependencias profundas)
@Component({ selector: 'app-confirmation-action-modal', template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
}

@Component({ selector: 'app-change-password-modal', template: '' })
class MockChangePasswordModalComponent {
  @Input() isOpen = false;
}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  // Variables para los mocks
  let mockAuthService: any;
  let mockUserService: any;
  let mockInboxService: any;
  let mockRouter: any;

  // Signals reactivos para manipular el estado durante las pruebas
  let mockCurrentUserSignal: WritableSignal<any>;
  let mockUnreadCountSignal: WritableSignal<number>;

  beforeEach(async () => {
    // Inicialización de Signals mockeados
    mockCurrentUserSignal = signal({ id: 1, roles: ['Director', 'Jurado'] });
    mockUnreadCountSignal = signal(0);

    mockAuthService = {
      currentUser: mockCurrentUserSignal,
      logout: jest.fn()
    };

    mockUserService = {
      formatFullName: jest.fn().mockReturnValue('Simón Guzmán')
    };

    mockInboxService = {
      unreadCount: mockUnreadCountSignal
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
    // Sobrescribimos referenciando explícitamente las clases reales
    .overrideComponent(HeaderComponent, {
      remove: { imports: [ConfirmationActionModalComponent, ChangePasswordModalComponent] },
      add: { imports: [MockConfirmationActionModalComponent, MockChangePasswordModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Inicialización y Propiedades Computadas', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería calcular el nombre de usuario usando UserService si existe sesión', () => {
      expect(component['userFullName']()).toBe('Simón Guzmán');
      expect(mockUserService.formatFullName).toHaveBeenCalledWith({ id: 1, roles: ['Director', 'Jurado'] });
    });

    it('debería retornar "Invitado" si no hay usuario en sesión', () => {
      mockCurrentUserSignal.set(null);
      fixture.detectChanges();

      expect(component['userFullName']()).toBe('Invitado');
    });

    it('debería formatear correctamente los roles separados por barra', () => {
      expect(component['userRoleLabel']()).toBe('Director / Jurado');
    });

    it('debería manejar usuarios sin roles correctamente', () => {
      mockCurrentUserSignal.set({ id: 1, roles: [] });
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
      mockUnreadCountSignal.set(0);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bg-\\[\\#DB141C\\]');
      expect(badge).toBeNull();
    });

    it('debería renderizar el badge con el número exacto si es entre 1 y 9', () => {
      mockUnreadCountSignal.set(5);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bg-\\[\\#DB141C\\]');
      expect(badge.textContent.trim()).toBe('5');
    });

    it('debería renderizar "9+" en el badge si hay más de 9 notificaciones', () => {
      mockUnreadCountSignal.set(12);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bg-\\[\\#DB141C\\]');
      expect(badge.textContent.trim()).toBe('9+');
    });
  });
});
