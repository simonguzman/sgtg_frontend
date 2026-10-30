import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError, Observable } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ChangePasswordModalComponent } from './change-password-modal.component';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../notifications/services/notification.service';

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
    changePassword: jest.Mock<Observable<any>, [string, string]>,
    currentUser: jest.Mock
  };


  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante warnings y errores esperados (ej. HTTP)
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos el mock con funciones de Jest
    authServiceMock = {
      changePassword: jest.fn(),
      currentUser: jest.fn(() => ({ email: 'ana.perez@unicauca.edu.co', idNumber: 1061234567 }))
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
    it('debería exigir la política de contraseñas del backend', () => {
      const newPwdControl = component.passwordForm.get('newPassword');

      newPwdControl?.setValue('Cort1*');
      expect(newPwdControl?.hasError('passwordPolicy')).toBeTruthy();
      newPwdControl?.setValue('sinmayuscula1*');
      expect(newPwdControl?.hasError('passwordPolicy')).toBeTruthy();

      newPwdControl?.setValue('Clave123*');
      expect(newPwdControl?.valid).toBeTruthy();
    });

    it('debería rechazar una contraseña con el correo o el documento del usuario', () => {
      const newPwdControl = component.passwordForm.get('newPassword');

      newPwdControl?.setValue('Ana.Perez1*');
      expect(newPwdControl?.hasError('passwordPredecible')).toBeTruthy();
      newPwdControl?.setValue('Doc1061234567*');
      expect(newPwdControl?.hasError('passwordPredecible')).toBeTruthy();
    });

    it('debería mostrar los requisitos que ya cumple la contraseña escrita', () => {
      component.isOpen = true;
      component.passwordForm.get('newPassword')?.setValue('abc');
      fixture.detectChanges();

      const requisitos = Array.from(document.querySelectorAll('app-password-requirements li'))
        .map(li => li.textContent?.trim().replace(/\s+/g, ' '));
      expect(requisitos).toContain('check_circle Una letra minúscula(cumple)');
      expect(requisitos).toContain('radio_button_unchecked Una letra mayúscula(falta)');
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
        newPassword: 'Nueva_clave_8',
        confirmPassword: 'Nueva_clave_8'
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
        newPassword: 'Valid_clave1',
        confirmPassword: 'Valid_clave1'
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
      authServiceMock.changePassword.mockReturnValue(of({ success: true, message: 'Contraseña actualizada exitosamente.' }));
      const closeSpy = jest.spyOn(component, 'closeModal');
      const successSpy = jest.spyOn(TestBed.inject(NotificationService), 'success');

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
      expect(successSpy).toHaveBeenCalledWith('Contraseña actualizada', 'Contraseña actualizada exitosamente.');
    });

    it('debería manejar errores del servicio, remover el loading y mantener el modal abierto', () => {
      // Configuramos el mock para simular un error sincrónico
      authServiceMock.changePassword.mockReturnValue(throwError(() => new Error('La contraseña actual es incorrecta.')));

      const closeSpy = jest.spyOn(component, 'closeModal');
      const errorSpy = jest.spyOn(TestBed.inject(NotificationService), 'error');

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

      // El usuario ve el mensaje del backend
      expect(errorSpy).toHaveBeenCalledWith('No se cambió la contraseña', 'La contraseña actual es incorrecta.');
    });
  });
});
