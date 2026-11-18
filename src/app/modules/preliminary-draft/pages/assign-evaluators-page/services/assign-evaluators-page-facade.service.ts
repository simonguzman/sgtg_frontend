import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

/**
 * Fachada de la asignación de evaluadores: carga el anteproyecto, pide confirmación y registra la asignación.
 */
@Injectable()
export class AssignEvaluatorsPageFacadeService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);

  /** Id del anteproyecto, tomado de la ruta. */
  readonly targetPreliminaryDraftId = signal<string | null>(null);
  /** Anteproyecto al que se asignan los evaluadores. */
  readonly selectedPreliminaryDraft = signal<PreliminaryDraft | null>(null);
  /** true mientras se carga el anteproyecto. */
  readonly isDataLoading = signal<boolean>(true);

  /** Estado del modal de confirmación: si está abierto, los datos pendientes y si la operación está en curso. */
  readonly confirmState = signal({
    isOpen: false,
    pendingData: null as { ev1: string; ev2: string } | null,
    isProcessing: false
  });

  /** Carga el anteproyecto de la ruta. */
  init(): void {
    const resolvedId = this.route.snapshot.paramMap.get('id') ??
                       this.route.parent?.snapshot.paramMap.get('id') ??
                       this.route.parent?.parent?.snapshot.paramMap.get('id');

    if (!resolvedId) {
      this.showNavigationErrorNotification();
      this.goBack();
      return;
    }

    this.targetPreliminaryDraftId.set(resolvedId);
    this.loadPreliminaryDraftData(resolvedId);
  }

  private loadPreliminaryDraftData(id: string): void {
    this.preliminaryDraftService.getPreliminaryDraftById(id).subscribe({
      next: (preliminaryDraftData) => {
        if (preliminaryDraftData) {
          this.selectedPreliminaryDraft.set(preliminaryDraftData);
        } else {
          this.showDraftNotFoundNotification();
          this.goBack();
        }
        this.isDataLoading.set(false);
      },
      error: () => {
        this.isDataLoading.set(false);
        this.showConnectionErrorNotification();
        this.goBack();
      }
    });
  }

  /** Pide confirmar la asignación; mientras se guarda una no se abre otra confirmación. */
  handleAssign(evaluators: { ev1: string; ev2: string }): void {
    if (this.confirmState().isProcessing) return;
    this.confirmState.set({
      isOpen: true,
      pendingData: evaluators,
      isProcessing: false
    });
  }

  /** Registra la asignación confirmada y vuelve a los documentos cargados. */
  confirmAssignment(): void {
    const { pendingData, isProcessing } = this.confirmState();
    const preliminaryDraft = this.selectedPreliminaryDraft();

    if (!pendingData || !preliminaryDraft?.preliminaryDraftId || isProcessing) return;

    this.confirmState.update(state => ({ ...state, isProcessing: true }));
    this.showProcessingNotification();

    this.preliminaryDraftService.assignReviewers(
      preliminaryDraft.preliminaryDraftId,
      [pendingData.ev1, pendingData.ev2]
    ).subscribe({
      next: () => {
        this.showAssingEvaluatorsSuccessNotification();
        this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
        this.goBack();
      },
      error: (err: unknown) => {
        this.confirmState.update(state => ({ ...state, isProcessing: false, isOpen: false }));
        this.showAssignErrorNotification(err);
      }
    });
  }

  /** Cierra la confirmación sin asignar. */
  cancelAssignment(): void {
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
  }

  /** Vuelve a la página anterior o, si no hay, a los documentos cargados. */
  goBack(): void {
    this.navigation.back(() => this.router.navigate(['../'], { relativeTo: this.route }));
  }

  private showProcessingNotification(): void {
    this.notificationService.show({
      title: 'Procesando asignación',
      message: 'Guardando los evaluadores asignados en el sistema...',
      type: NotificationType.INFO
    });
  }

  private showNavigationErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de navegación',
      message: 'No se pudo identificar el anteproyecto para realizar la asignación.',
      type: NotificationType.ERROR
    });
  }

  private showDraftNotFoundNotification(): void {
    this.notificationService.show({
      title: 'Anteproyecto no encontrado',
      message: 'El registro solicitado no existe o no se encuentra disponible.',
      type: NotificationType.ERROR
    });
  }

  private showAssingEvaluatorsSuccessNotification(): void {
    this.notificationService.show({
      title: 'Asignación exitosa',
      message: 'Los jurados evaluadores han sido vinculados al anteproyecto correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  /** El motivo del backend (ej. un evaluador con conflicto de interés) o un mensaje genérico */
  private showAssignErrorNotification(err: unknown): void {
    this.notificationService.show({
      title: 'No se pudo asignar',
      message: apiErrorMessage(err, 'No se pudo completar la asignación. Por favor, intente más tarde.'),
      type: NotificationType.ERROR
    });
  }

  private showConnectionErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de servicio',
      message: 'No se pudo completar la asignación. Por favor, intente más tarde.',
      type: NotificationType.ERROR
    });
  }
}
