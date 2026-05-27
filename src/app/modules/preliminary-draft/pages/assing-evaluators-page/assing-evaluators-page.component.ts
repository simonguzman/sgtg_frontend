import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

import { AssignEvaluatorsFormComponent } from "../../components/assign-evaluators-form/assign-evaluators-form.component";
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

@Component({
  selector: 'app-assing-evaluators-page',
  templateUrl: './assing-evaluators-page.component.html',
  styleUrls: ['./assing-evaluators-page.component.css'],
  imports: [AssignEvaluatorsFormComponent]
})
export class AssingEvaluatorsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);

  targetPreliminaryDraftId = signal<string | null>(null);
  selectedPreliminaryDraft = signal<PreliminaryDraft | null>(null);
  isDataLoading = signal<boolean>(true);

  ngOnInit(): void {
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
    this.preliminaryDraftService.getPreliminaryDraftByIdMock(id).subscribe({
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
    const preliminaryDraft = this.selectedPreliminaryDraft();
    if (!preliminaryDraft?.preliminaryDraftId) return;
    this.showProcessingNotification();
    this.preliminaryDraftService.assignReviewersMock(
      preliminaryDraft.preliminaryDraftId,
      [evaluators.ev1, evaluators.ev2]
    ).subscribe({
      next: () => {
        this.showAssingEvaluatorsSuccessNotification();
        this.goBack();
      },
      error: () => {
        this.showConnectionErrorNotification();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
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

  private showConnectionErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de servicio',
      message: 'No se pudo completar la asignación. Por favor, intente más tarde.',
      type: NotificationType.ERROR
    });
  }
}
