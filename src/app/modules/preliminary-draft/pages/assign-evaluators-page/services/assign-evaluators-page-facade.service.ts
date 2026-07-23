import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

@Injectable()
export class AssignEvaluatorsPageFacadeService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);

  readonly targetPreliminaryDraftId = signal<string | null>(null);
  readonly selectedPreliminaryDraft = signal<PreliminaryDraft | null>(null);
  readonly isDataLoading = signal<boolean>(true);

  readonly confirmState = signal({
    isOpen: false,
    pendingData: null as { ev1: string; ev2: string } | null,
    isProcessing: false
  });

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

  handleAssign(evaluators: { ev1: string; ev2: string }): void {
    this.confirmState.set({
      isOpen: true,
      pendingData: evaluators,
      isProcessing: false
    });
  }

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
      error: () => {
        this.confirmState.update(state => ({ ...state, isProcessing: false, isOpen: false }));
        this.showConnectionErrorNotification();
      }
    });
  }

  cancelAssignment(): void {
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  // Notificaciones privadas
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

  private showConnectionErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de servicio',
      message: 'No se pudo completar la asignación. Por favor, intente más tarde.',
      type: NotificationType.ERROR
    });
  }
}
