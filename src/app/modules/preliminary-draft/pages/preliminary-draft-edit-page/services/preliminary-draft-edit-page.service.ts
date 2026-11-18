import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { anteproyectoCorregible } from '../../../services/preliminary-draft-rules';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';

/** Fachada de la corrección del anteproyecto. */
@Injectable()
export class PreliminaryDraftEditPageService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** Anteproyecto que se corrige. */
  readonly preliminaryDraftToEdit = signal<PreliminaryDraft | null>(null);

  /** Estado del modal de confirmación: si está abierto, los datos pendientes y si la operación está en curso. */
  readonly confirmState = signal({
    isOpen: false,
    pendingData: null as PreliminaryDraft | null,
    isProcessing: false
  });

  /** Carga el anteproyecto de la ruta. Solo el director radica versiones, y solo tras correcciones de los evaluadores o un «No aprobado» del Consejo; a los demás los devuelve a la lista con un aviso. */
  init(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id');
    if (preliminaryDraftId) this.loadPreliminaryDraftData(preliminaryDraftId);
    else this.router.navigate(['/preliminary-draft']);
  }

  private loadPreliminaryDraftData(id: string): void {
    this.preliminaryDraftService.getPreliminaryDraftById(id).subscribe({
      next: (foundPreliminaryDraft) => {
        if (foundPreliminaryDraft) {
          const currentUser = this.authService.currentUser();
          const currentUserId = currentUser?.id;

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

  /** Pide confirmar la nueva versión; mientras se guarda una no se abre otra confirmación. */
  handleUpdate(updatedData: PreliminaryDraft): void {
    if (this.confirmState().isProcessing) return;
    this.confirmState.set({
      isOpen: true,
      pendingData: updatedData,
      isProcessing: false
    });
  }

  /** Radica la nueva versión confirmada y vuelve a la lista. */
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

  /** Cierra la confirmación sin guardar. */
  cancelUpdate(): void {
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
  }

  /** Vuelve a la página anterior o, si no hay, a la lista de anteproyectos. */
  goBack(): void {
    this.navigation.back(() => this.router.navigate(['/preliminary-draft']));
  }

  private handleUpdateSuccess(): void {
    this.showUpdateSuccessNotification();
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
    this.goBack();
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
