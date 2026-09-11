import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError, Observable } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ChangePasswordModalComponent } from './change-password-modal.component';
import { AuthService } from '../../../../core/services/auth/auth.service';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { ButtonComponent } from '../../button-component/button-component.component';
import { ConfirmationActionModalComponent } from "../confirmation-action-modal/confirmation-action-modal.component";

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
  @Input() type = 'button';
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ChangePasswordModalComponent', () => {
  let component: ChangePasswordModalComponent;
  let fixture: ComponentFixture<ChangePasswordModalComponent>;

  // Tipado estricto utilizando las verdaderas firmas que usa el componente
  let authServiceMock: {
    changePassword: jest.Mock<Observable<any>, [string, string]>
  };

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante warnings y errores esperados (ej. HTTP)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos el mock con funciones de Jest
    authServiceMock = {
      changePassword: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        ChangePasswordModalComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock }
      ]
    })
    .overrideComponent(ChangePasswordModalComponent, {
      remove: {
        imports: [ButtonComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockButtonComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangePasswordModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías
  });

  describe('Inicialización y Renderizado Básico', () => {
    it('debería crearse el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería inicializar el formulario como inválido por defecto', () => {
      expect(component.passwordForm.valid).toBeFalsy();
    });
  });

  describe('Validaciones del Formulario', () => {
    it('debería marcar la contraseña nueva como inválida si tiene menos de 8 caracteres', () => {
      const newPwdControl = component.passwordForm.get('newPassword');

      newPwdControl?.setValue('1234567');
      expect(newPwdControl?.hasError('minlength')).toBeTruthy();

      newPwdControl?.setValue('12345678');
      expect(newPwdControl?.hasError('minlength')).toBeFalsy();
    });

    it('debería detectar cuando las contraseñas no coinciden mediante passwordMatchValidator', () => {
      component.passwordForm.patchValue({
        newPassword: 'password123',
        confirmPassword: 'password456'
      });
      // Actualizamos para forzar la validación a nivel de formGroup
      component.passwordForm.updateValueAndValidity();

      expect(component.passwordForm.hasError('passwordMismatch')).toBeTruthy();
    });

    it('debería ser válido cuando las contraseñas coinciden y cumplen todos los requisitos', () => {
      component.passwordForm.patchValue({
        currentPassword: 'current_password_123',
        newPassword: 'new_password_8',
        confirmPassword: 'new_password_8'
      });
      component.passwordForm.updateValueAndValidity();

      expect(component.passwordForm.valid).toBeTruthy();
    });
  });

  describe('Interacciones y Visibilidad', () => {
    it('debería alternar correctamente la visibilidad de todos los campos de contraseña', () => {
      expect(component.showCurrentPassword).toBeFalsy();
      component.togglePasswordVisibility('current');
      expect(component.showCurrentPassword).toBeTruthy();

      expect(component.showNewPassword).toBeFalsy();
      component.togglePasswordVisibility('new');
      expect(component.showNewPassword).toBeTruthy();

      expect(component.showConfirmPassword).toBeFalsy();
      component.togglePasswordVisibility('confirm');
      expect(component.showConfirmPassword).toBeTruthy();
    });

    it('debería abrir el modal de confirmación al intentar guardar con datos válidos', () => {
      component.passwordForm.patchValue({
        currentPassword: 'valid_password',
        newPassword: 'valid_password',
        confirmPassword: 'valid_password'
      });

      component.onAttemptSave();

      expect(component.isConfirmActionOpen).toBeTruthy();
    });

    it('NO debería abrir el modal de confirmación si el formulario es inválido al intentar guardar', () => {
      component.onAttemptSave(); // Formulario vacío por defecto (inválido)

      expect(component.isConfirmActionOpen).toBeFalsy();
    });

    it('debería resetear el formulario y emitir onClose al cerrar el modal', () => {
      const emitSpy = jest.spyOn(component.onClose, 'emit');
      component.passwordForm.patchValue({ currentPassword: 'algo' });

      component.closeModal();

      expect(component.passwordForm.get('currentPassword')?.value).toBeNull();
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Envío de Datos (AuthService)', () => {
    it('debería llamar al servicio changePassword, remover el loading y cerrar el modal al confirmar', () => {
      authServiceMock.changePassword.mockReturnValue(of({ success: true }));
      const closeSpy = jest.spyOn(component, 'closeModal');

      component.passwordForm.patchValue({
        currentPassword: 'old_password',
        newPassword: 'new_password_long',
        confirmPassword: 'new_password_long'
      });

      component.confirmChange();

      expect(component.isConfirmActionOpen).toBeFalsy();
      expect(component.isLoading).toBeFalsy();
      expect(authServiceMock.changePassword).toHaveBeenCalledWith('old_password', 'new_password_long');
      expect(authServiceMock.changePassword).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores del servicio, remover el loading y mantener el modal abierto', () => {
      // Configuramos el mock para simular un error sincrónico
      authServiceMock.changePassword.mockReturnValue(throwError(() => new Error('Error de red')));

      const closeSpy = jest.spyOn(component, 'closeModal');

      component.passwordForm.patchValue({
        currentPassword: 'old_password',
        newPassword: 'new_password_long',
        confirmPassword: 'new_password_long'
      });

      component.confirmChange();

      expect(component.isConfirmActionOpen).toBeFalsy();
      expect(component.isLoading).toBeFalsy();
      expect(authServiceMock.changePassword).toHaveBeenCalledTimes(1);
      expect(closeSpy).not.toHaveBeenCalled(); // No debe cerrarse el modal si hay error

      // Comprobamos que el console.error (previamente interceptado en el beforeEach) se ejecutó
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al cambiar contraseña:', 'Error de red');
    });
  });
});
