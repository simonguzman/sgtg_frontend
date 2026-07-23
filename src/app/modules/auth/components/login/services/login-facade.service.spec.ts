import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LoginFacadeService } from './login-facade.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('LoginFacadeService', () => {
  let service: LoginFacadeService;

  // ── Tipado estricto de los mocks ───────────────────────────────────────────
  let authServiceMock: {
    // isAuthenticated() retorna un boolean, no recibe argumentos
    isAuthenticated: jest.Mock<boolean, []>;
    // login() retorna un Observable, recibe un objeto con email y password
    login: jest.Mock<Observable<{ success: boolean; message?: string }>, [{ email: string; password: string }]>;
  };

  let notificationServiceMock: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
  };

  let routerMock: {
    navigate: jest.Mock<Promise<boolean>, [string[]]>;
  };

  beforeEach(() => {
    // 1. Inicializamos los mocks con jest.fn()
    authServiceMock = {
      isAuthenticated: jest.fn(),
      login: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    // 2. Configuramos el módulo de pruebas
    TestBed.configureTestingModule({
      providers: [
        LoginFacadeService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    service = TestBed.inject(LoginFacadeService);

    // Silenciar console.error (no requiere mock manual de tipos porque usamos spyOn)
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAlreadyAuthenticated', () => {
    it('debe redirigir a /notifications si el usuario está autenticado', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      service.checkAlreadyAuthenticated();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('NO debe redirigir si el usuario no está autenticado', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);
      service.checkAlreadyAuthenticated();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const mockCredentials = { email: 'test@unicauca.edu.co', password: 'password123' };

    // Tipamos los callbacks
    let onStartMock: jest.Mock<void, []>;
    let onCompleteMock: jest.Mock<void, []>;

    beforeEach(() => {
      onStartMock = jest.fn();
      onCompleteMock = jest.fn();
    });

    it('debe ejecutar flujo exitoso: notificar y redirigir', () => {
      authServiceMock.login.mockReturnValue(of({ success: true }));

      service.login(mockCredentials, onStartMock, onCompleteMock);

      expect(onStartMock).toHaveBeenCalled();
      expect(authServiceMock.login).toHaveBeenCalledWith(mockCredentials);
      expect(onCompleteMock).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: '¡Bienvenido!',
        message: 'Sesión iniciada correctamente.',
        type: NotificationType.CONFIRMATION
      });
      expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('debe ejecutar flujo fallido (credenciales incorrectas): notificar error sin redirigir', () => {
      authServiceMock.login.mockReturnValue(of({ success: false, message: 'Credenciales incorrectas' }));

      service.login(mockCredentials, onStartMock, onCompleteMock);

      expect(onStartMock).toHaveBeenCalled();
      expect(onCompleteMock).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Credenciales incorrectas',
        type: NotificationType.ERROR
      });
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('debe manejar errores críticos del sistema (ej. 500 o sin red)', () => {
      authServiceMock.login.mockReturnValue(throwError(() => new Error('Network error')));

      service.login(mockCredentials, onStartMock, onCompleteMock);

      expect(onStartMock).toHaveBeenCalled();
      expect(onCompleteMock).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error del Sistema',
        message: 'Ocurrió un error técnico al intentar conectar.',
        type: NotificationType.SECURITY
      });
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
