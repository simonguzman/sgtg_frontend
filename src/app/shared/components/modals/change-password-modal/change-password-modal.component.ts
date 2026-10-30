import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '../../button-component/button-component.component';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ConfirmationActionModalComponent } from "../confirmation-action-modal/confirmation-action-modal.component";
import { NotificationService } from '../../notifications/services/notification.service';
import { PasswordRequirementsComponent } from '../../password-requirements/password-requirements.component';
import { PASSWORD_PREDECIBLE, passwordPolicyValidator } from '../../../../core/utils/password-policy';

export const passwordMatchValidator = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
};

@Component({
  selector: 'app-change-password-modal',
  imports: [DialogModule, CommonModule, ReactiveFormsModule, ButtonComponent, ConfirmationActionModalComponent,
    PasswordRequirementsComponent],
  templateUrl: './change-password-modal.component.html',
  styleUrls: ['./change-password-modal.component.css']
})
export class ChangePasswordModalComponent {

  @Input() isOpen: boolean = false;
  @Output() onClose = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly mensajePredecible = PASSWORD_PREDECIBLE;
  isLoading = false;
  isConfirmActionOpen = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, passwordPolicyValidator(() => this.datosDelUsuario())]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  /** Correo y documento del usuario: la contraseña nueva no puede contenerlos */
  private datosDelUsuario(): (string | null | undefined)[] {
    const usuario = this.authService.currentUser();
    return [usuario?.email, usuario?.idNumber?.toString()];
  }

  closeModal() {
    this.passwordForm.reset();
    this.onClose.emit();
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    if (field === 'current') this.showCurrentPassword = !this.showCurrentPassword;
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
    if (field === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  onAttemptSave() {
    if (this.passwordForm.valid) {
      this.isConfirmActionOpen = true;
    }
  }

  confirmChange() {
    this.isConfirmActionOpen = false;
    this.isLoading = true;

    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.notificationService.success('Contraseña actualizada', response.message);
        this.closeModal();
      },
      error: (err: Error) => {
        // El modal sigue abierto para que el usuario corrija los datos
        this.isLoading = false;
        this.notificationService.error('No se cambió la contraseña', err.message);
      }
    });
  }
}
