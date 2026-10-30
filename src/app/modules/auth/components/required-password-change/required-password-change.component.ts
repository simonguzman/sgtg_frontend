import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { PasswordRequirementsComponent } from '../../../../shared/components/password-requirements/password-requirements.component';
import { passwordMatchValidator } from '../../../../shared/components/modals/change-password-modal/change-password-modal.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { PASSWORD_PREDECIBLE, passwordPolicyValidator } from '../../../../core/utils/password-policy';

/**
 * Cambio obligatorio de la contraseña que asignó un administrador: hasta que
 * el usuario la cambie, el backend solo le permite esto (y los guards lo traen
 * aquí desde cualquier otra pantalla).
 */
@Component({
  selector: 'app-required-password-change',
  imports: [ReactiveFormsModule, ButtonComponent, PasswordRequirementsComponent],
  templateUrl: './required-password-change.component.html'
})
export class RequiredPasswordChangeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly mensajePredecible = PASSWORD_PREDECIBLE;
  readonly isLoading = signal(false);
  readonly showPasswords = signal(false);

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, passwordPolicyValidator(() => this.datosDelUsuario())]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  togglePasswords(): void {
    this.showPasswords.update(visible => !visible);
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.isLoading.set(true);
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notificationService.success('Contraseña actualizada', 'Ya puedes usar el sistema con tu nueva contraseña.');
        this.router.navigate(['/notifications']);
      },
      error: (err: Error) => {
        // Sigue en la pantalla para que corrija los datos
        this.isLoading.set(false);
        this.notificationService.error('No se cambió la contraseña', err.message);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  /** Correo y documento del usuario: la contraseña nueva no puede contenerlos */
  private datosDelUsuario(): (string | null | undefined)[] {
    const usuario = this.authService.currentUser();
    return [usuario?.email, usuario?.idNumber?.toString()];
  }
}
