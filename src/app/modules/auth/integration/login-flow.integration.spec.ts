// src/app/modules/auth/integration/login-flow.integration.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from '../components/login/login.component'; // Ajusta la ruta a tu LoginComponent
import { LoginFacadeService } from '../components/login/services/login-facade.service'; // Ajusta la ruta a tu facade
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

describe('Integración [Auth Module]: Flujo de Login (Componente + Fachada)', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let facade: LoginFacadeService;

  // Mocks de dependencias externas a la fachada
  let authServiceMock: { isAuthenticated: jest.Mock; login: jest.Mock };
  let routerMock: { navigate: jest.Mock };
  let notificationMock: { show: jest.Mock };

  beforeEach(async () => {
    // Inicializamos los mocks
    authServiceMock = {
      isAuthenticated: jest.fn(),
      login: jest.fn()
    };
    routerMock = { navigate: jest.fn() };
    notificationMock = { show: jest.fn() };

    jest.spyOn(console, 'error').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        LoginComponent // Componente standalone importado directamente
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe redirigir automáticamente a /notifications si el usuario ya está autenticado al cargar', () => {
    // Arrange: Simulamos que ya hay sesión
    authServiceMock.isAuthenticated.mockReturnValue(true);

    // Act: Dispara el ngOnInit
    fixture.detectChanges();

    // Assert: Debe haber invocado la redirección sin mostrar el form
    expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
  });

  it('no debe llamar al facade si el formulario es inválido y debe marcar los campos como tocados', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    fixture.detectChanges();
    const facadeSpy = jest.spyOn(facade, 'login');

    // Act: Formulario vacío por defecto, intentamos enviar
    component.onSubmit();

    // Assert
    expect(facadeSpy).not.toHaveBeenCalled();
    expect(component.loginForm.touched).toBe(true);
    expect(component.loginForm.valid).toBe(false);
  });

  it('FLUJO EXITOSO: debe mostrar notificación, navegar y manejar el estado de carga (isLoading)', fakeAsync(() => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    // Simulamos respuesta exitosa del backend
    authServiceMock.login.mockReturnValue(of({ success: true }));
    fixture.detectChanges();

    // Llenamos el formulario correctamente
    component.loginForm.controls.email.setValue('test@unicauca.edu.co');
    component.loginForm.controls.password.setValue('password123');

    // Act
    component.onSubmit();

    // Verificamos que el signal de carga se haya activado (aunque sea momentáneamente)
    // y desactivado al completarse el observable.
    expect(component.isLoading()).toBe(false);

    // Assert: Llamada al core
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'test@unicauca.edu.co',
      password: 'password123'
    });

    // Assert: Notificación de éxito
    expect(notificationMock.show).toHaveBeenCalledWith({
      title: '¡Bienvenido!',
      message: 'Sesión iniciada correctamente.',
      type: NotificationType.CONFIRMATION
    });

    // Assert: Redirección
    expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
  }));

  it('FLUJO FALLIDO: debe mostrar notificación de error, NO navegar y apagar el loading si las credenciales son incorrectas', fakeAsync(() => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    // Simulamos que el core rechaza el login
    authServiceMock.login.mockReturnValue(of({ success: false, message: 'Correo o contraseña incorrectos.' }));
    fixture.detectChanges();

    component.loginForm.controls.email.setValue('test@unicauca.edu.co');
    component.loginForm.controls.password.setValue('wrongpass');

    // Act
    component.onSubmit();

    // Assert
    expect(component.isLoading()).toBe(false); // Se apaga el loading
    expect(routerMock.navigate).not.toHaveBeenCalled(); // No debe dejarlo pasar
    expect(notificationMock.show).toHaveBeenCalledWith({
      title: 'Error',
      message: 'Correo o contraseña incorrectos.',
      type: NotificationType.ERROR
    });
  }));

  it('FLUJO DE ERROR TÉCNICO: debe atrapar excepciones del observable y mostrar notificación de seguridad', fakeAsync(() => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    // Simulamos una caída del servidor o error RxJS
    authServiceMock.login.mockReturnValue(throwError(() => new Error('Server 500')));
    fixture.detectChanges();

    component.loginForm.controls.email.setValue('test@unicauca.edu.co');
    component.loginForm.controls.password.setValue('password123');

    // Act
    component.onSubmit();

    // Assert
    expect(component.isLoading()).toBe(false); // Resetea el botón para reintentar
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(notificationMock.show).toHaveBeenCalledWith({
      title: 'Error del Sistema',
      message: 'Ocurrió un error técnico al intentar conectar.',
      type: NotificationType.SECURITY
    });
  }));
});
