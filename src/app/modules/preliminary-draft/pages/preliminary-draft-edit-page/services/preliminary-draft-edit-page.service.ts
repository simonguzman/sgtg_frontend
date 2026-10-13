import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { anteproyectoCorregible } from '../../../services/preliminary-draft-rules';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable()
export class PreliminaryDraftEditPageService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly preliminaryDraftToEdit = signal<PreliminaryDraft | null>(null);

  readonly confirmState = signal({
    isOpen: false,
    pendingData: null as PreliminaryDraft | null,
    isProcessing: false
  });

  init(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id');
    preliminaryDraftId ? this.loadPreliminaryDraftData(preliminaryDraftId) : this.router.navigate(['/preliminary-draft']);
  }

  private loadPreliminaryDraftData(id: string): void {
    this.preliminaryDraftService.getPreliminaryDraftById(id).subscribe({
      next: (foundPreliminaryDraft) => {
        if (foundPreliminaryDraft) {
          const currentUser = this.authService.currentUser();
          const currentUserId = currentUser?.id;

          // Solo el director radica versiones, y solo tras correcciones o un NO APROBADO del Consejo
          const isDraftOwner = foundPreliminaryDraft.proposalData.director?.id === currentUserId;
          if (!isDraftOwner) {
            this.handleUpdateError('Solo el director puede cargar una nueva versión del anteproyecto.');
            this.router.navigate(['/preliminary-draft']);
            return;
          }
          if (!anteproyectoCorregible(foundPreliminaryDraft)) {
            this.handleUpdateError('El anteproyecto solo se corrige cuando los evaluadores piden correcciones o el Consejo no lo aprueba.');
            this.router.navigate(['/preliminary-draft']);
            return;
          }

          this.preliminaryDraftToEdit.set({ ...foundPreliminaryDraft });
        } else {
          this.handleNotFound();
        }
      },
      error: () => this.handleUpdateError('Error al cargar la información del anteproyecto.')
    });
  }

  handleUpdate(updatedData: PreliminaryDraft): void {
    this.confirmState.set({
      isOpen: true,
      pendingData: updatedData,
      isProcessing: false
    });
  }

  confirmUpdate(): void {
    const currentPreliminaryDraft = this.preliminaryDraftToEdit();
    const { pendingData, isProcessing } = this.confirmState();

    if (!currentPreliminaryDraft?.preliminaryDraftId || !pendingData || isProcessing) return;

    this.confirmState.update(state => ({ ...state, isProcessing: true }));
    this.showUpdateInfoNotification();

    this.preliminaryDraftService.updatePreliminaryDraft(currentPreliminaryDraft.preliminaryDraftId, pendingData).subscribe({
      next: () => this.handleUpdateSuccess(),
      error: (err) => {
        this.confirmState.update(state => ({ ...state, isProcessing: false }));
        this.handleUpdateError(apiErrorMessage(err, 'No se pudo cargar la nueva versión del anteproyecto.'));
      }
    });
  }

  cancelUpdate(): void {
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
  }

  goBack(): void {
    this.location.back();
  }

  private handleUpdateSuccess(): void {
    this.showUpdateSuccessNotification();
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
    this.router.navigate(['/preliminary-draft']);
  }

  private handleUpdateError(customMessage?: string): void {
    this.showUpdateErrorNotification(customMessage);
    this.confirmState.update(state => ({ ...state, isOpen: false }));
  }

  private handleNotFound(): void {
    this.showNotFoundNotification();
    this.router.navigate(['/preliminary-draft']);
  }

  private showUpdateInfoNotification() {
    this.notificationService.show({
      title: 'Actualizando registro',
      message: 'Procesando los cambios en el anteproyecto...',
      type: NotificationType.INFO
    });
  }

  private showUpdateSuccessNotification() {
    this.notificationService.show({
      title: '¡Cambios guardados!',
      message: 'El anteproyecto ha sido actualizado correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showUpdateErrorNotification(customMessage?: string) {
    this.notificationService.show({
      title: 'Error de guardado',
      message: customMessage || 'No se pudieron aplicar los cambios. Verifique su conexión e intente nuevamente.',
      type: NotificationType.ERROR
    });
  }

  private showNotFoundNotification() {
    this.notificationService.show({
      title: 'Registro no encontrado',
      message: 'El anteproyecto solicitado no existe o ha sido eliminado.',
      type: NotificationType.ERROR
    });
  }
}
