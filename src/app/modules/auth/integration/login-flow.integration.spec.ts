import 'fake-indexeddb/auto';
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LoginComponent } from '../components/login/login.component';
import { LoginFacadeService } from '../components/login/services/login-facade.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

describe('Integración [Auth Module]: Flujo de Login (Componente + Fachada)', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let facade: LoginFacadeService;
  let authServiceMock: {
    isAuthenticated: jest.Mock<boolean, []>;
    login: jest.Mock<Observable<{ success: boolean; message?: string }>, [Record<string, string>]>
  };
  let routerMock: { navigate: jest.Mock<Promise<boolean>, [string[]]> };
  let notificationMock: { show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]> };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    authServiceMock = {
      isAuthenticated: jest.fn(),
      login: jest.fn()
    };
    routerMock = { navigate: jest.fn().mockResolvedValue(true) };
    notificationMock = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        LoginComponent
      ],
      providers: [
        LoginFacadeService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    facade = TestBed.inject(LoginFacadeService);
    localStorage.clear();
  });

  it('debe redirigir automáticamente a /notifications si el usuario ya está autenticado al cargar', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    fixture.detectChanges();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
  });

  it('no debe llamar al facade si el formulario es inválido y debe marcar los campos como tocados', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    fixture.detectChanges();
    const facadeSpy = jest.spyOn(facade, 'login');
    component.onSubmit();
    expect(facadeSpy).not.toHaveBeenCalled();
    expect(component.loginForm.touched).toBe(true);
    expect(component.loginForm.valid).toBe(false);
  });

  it('FLUJO EXITOSO: debe mostrar notificación, navegar y manejar el estado de carga (isLoading)', fakeAsync(() => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.login.mockReturnValue(of({ success: true }));
    fixture.detectChanges();
    component.loginForm.controls['email'].setValue('test@unicauca.edu.co');
    component.loginForm.controls['password'].setValue('password123');
    component.onSubmit();
    expect(component.isLoading()).toBe(false);
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'test@unicauca.edu.co',
      password: 'password123'
    });
    expect(notificationMock.show).toHaveBeenCalledWith({
      title: '¡Bienvenido!',
      message: 'Sesión iniciada correctamente.',
      type: NotificationType.CONFIRMATION
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
  }));

  it('FLUJO FALLIDO: debe mostrar notificación de error, NO navegar y apagar el loading si las credenciales son incorrectas', fakeAsync(() => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.login.mockReturnValue(of({ success: false, message: 'Correo o contraseña incorrectos.' }));
    fixture.detectChanges();
    component.loginForm.controls['email'].setValue('test@unicauca.edu.co');
    component.loginForm.controls['password'].setValue('wrongpass');
    component.onSubmit();
    expect(component.isLoading()).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(notificationMock.show).toHaveBeenCalledWith({
      title: 'Error',
      message: 'Correo o contraseña incorrectos.',
      type: NotificationType.ERROR
    });
  }));

  it('FLUJO DE ERROR TÉCNICO: debe atrapar excepciones del observable y mostrar notificación de seguridad', fakeAsync(() => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.login.mockReturnValue(throwError(() => new Error('Server 500')));
    fixture.detectChanges();
    component.loginForm.controls['email'].setValue('test@unicauca.edu.co');
    component.loginForm.controls['password'].setValue('password123');
    component.onSubmit();
    expect(component.isLoading()).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(notificationMock.show).toHaveBeenCalledWith({
      title: 'Error del Sistema',
      message: 'Ocurrió un error técnico al intentar conectar.',
      type: NotificationType.SECURITY
    });
  }));
});
