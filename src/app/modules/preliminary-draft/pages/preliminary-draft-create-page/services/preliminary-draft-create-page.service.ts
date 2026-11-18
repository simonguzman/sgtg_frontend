import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { first } from 'rxjs';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';

/** Fachada del registro del anteproyecto. */
@Injectable()
export class PreliminaryDraftCreatePageService {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);

  /** Estado del modal de confirmación: si está abierto, los datos pendientes y si la operación está en curso. */
  readonly confirmState = signal({
    isOpen: false,
    pendingData: null as PreliminaryDraft | null,
    isProcessing: false
  });

  /** Solo el director y el administrador registran anteproyectos; a los demás los devuelve a la lista con un aviso. */
  checkAccess(): void {
    const hasRequiredRoles = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DIRECTOR
    ]);
    if (!hasRequiredRoles) {
      this.showAccessDeniedNotification();
      this.router.navigate(['/preliminary-draft']);
    }
  }

  /** Pide confirmar el registro; mientras se registra uno no se abre otra confirmación, para no enviarlo dos veces. */
  openConfirmation(preliminaryDraft: PreliminaryDraft): void {
    if (this.confirmState().isProcessing) return;
    this.confirmState.set({
      isOpen: true,
      pendingData: preliminaryDraft,
      isProcessing: false
    });
  }

  /** Registra el anteproyecto confirmado y vuelve a la lista. */
  confirmCreation(): void {
    const { pendingData, isProcessing } = this.confirmState();

    if (!pendingData || isProcessing) return;

    this.confirmState.update(state => ({ ...state, isProcessing: true }));
    this.showProcessingNotification();

    this.preliminaryDraftService.createPreliminaryDraft(pendingData)
      .pipe(first())
      .subscribe({
        next: () => this.handleCreationSuccess(),
        error: (error) => {
          console.error('Error al registrar anteproyecto:', error);
          this.confirmState.update(state => ({ ...state, isProcessing: false, isOpen: false }));
          this.showCreationErrorNotification();
        }
      });
  }

  /** Cierra la confirmación sin registrar. */
  cancelCreation(): void {
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
  }

  /** Vuelve a la página anterior o, si no hay, a la lista de anteproyectos. */
  goBack(): void {
    this.navigation.back(() => this.router.navigate(['/preliminary-draft']));
  }

  private handleCreationSuccess(): void {
    this.showSuccessNotification();
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
    this.goBack();
  }

  private showSuccessNotification(): void {
    this.notificationService.show({
      title: '¡Registro exitoso!',
      message: 'El anteproyecto ha sido creado correctamente y está listo para evaluación.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showAccessDeniedNotification(): void {
    this.notificationService.show({
      title: 'Acceso restringido',
      message: 'No cuenta con los permisos necesarios para registrar nuevos anteproyectos.',
      type: NotificationType.ERROR
    });
  }

  private showProcessingNotification(): void {
    this.notificationService.show({
      title: 'Procesando solicitud',
      message: 'Guardando la información del anteproyecto en el sistema...',
      type: NotificationType.INFO
    });
  }

  private showCreationErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de registro',
      message: 'Hubo un problema al intentar guardar el anteproyecto. Por favor, intente de nuevo.',
      type: NotificationType.ERROR
    });
  }
}
