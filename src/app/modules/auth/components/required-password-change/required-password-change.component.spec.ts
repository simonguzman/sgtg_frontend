import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RequiredPasswordChangeComponent } from './required-password-change.component';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

describe('RequiredPasswordChangeComponent', () => {
  let fixture: ComponentFixture<RequiredPasswordChangeComponent>;
  let component: RequiredPasswordChangeComponent;
  let authService: { changePassword: jest.Mock; logout: jest.Mock; currentUser: jest.Mock };
  let router: { navigate: jest.Mock };
  let notification: { success: jest.Mock; error: jest.Mock };

  const llenar = (actual: string, nueva: string, confirmacion = nueva) =>
    component.passwordForm.setValue({ currentPassword: actual, newPassword: nueva, confirmPassword: confirmacion });

  beforeEach(() => {
    authService = {
      changePassword: jest.fn(),
      logout: jest.fn(),
      currentUser: jest.fn(() => ({ email: 'ana.perez@unicauca.edu.co', idNumber: 1061234567 }))
    };
    router = { navigate: jest.fn() };
    notification = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      imports: [RequiredPasswordChangeComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: notification }
      ]
    });
    fixture = TestBed.createComponent(RequiredPasswordChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('con la contraseña nueva válida la cambia y entra al sistema', () => {
    authService.changePassword.mockReturnValue(of({ success: true, message: 'Contraseña actualizada exitosamente.' }));
    llenar('Asignada1*', 'MiClave2026*');

    component.onSubmit();

    expect(authService.changePassword).toHaveBeenCalledWith('Asignada1*', 'MiClave2026*');
    expect(notification.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/notifications']);
    expect(component.isLoading()).toBe(false);
  });

  it('no envía una contraseña que no cumple la política o no coincide con la confirmación', () => {
    llenar('Asignada1*', 'corta');
    component.onSubmit();
    llenar('Asignada1*', 'MiClave2026*', 'Otra2026*');
    component.onSubmit();
    // Contiene el documento del usuario
    llenar('Asignada1*', 'Doc1061234567*');
    component.onSubmit();

    expect(authService.changePassword).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Es fácil de adivinar');
  });

  it('si el backend la rechaza se queda en la pantalla y muestra el motivo', () => {
    authService.changePassword.mockReturnValue(
      throwError(() => new Error('La contraseña nueva no puede ser ninguna de las últimas 5 que has usado.')));
    llenar('Asignada1*', 'MiClave2026*');

    component.onSubmit();

    expect(notification.error).toHaveBeenCalledWith('No se cambió la contraseña',
      'La contraseña nueva no puede ser ninguna de las últimas 5 que has usado.');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
  });

  it('permite cerrar sesión sin cambiarla', () => {
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('muestra los requisitos de la contraseña', () => {
    expect(fixture.nativeElement.querySelectorAll('app-password-requirements li').length).toBe(6);
  });
});
