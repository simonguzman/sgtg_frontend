import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { resolveApprovedEvaluationDocument } from '../../../../../core/utils/evaluation-utils';
import { stateList } from '../../../../../core/enums/state.enum';
import { versionVigente } from '../../../services/preliminary-draft-rules';
import {
  buildWorkDetailsView, fullName, remainingDaysHint
} from '../../../../../shared/components/work-details/work-details.builder';
import { WorkDetailsDocument, WorkDetailsView } from '../../../../../shared/components/work-details/work-details.model';

@Injectable()
export class PreliminaryDraftDetailsPageService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);

  readonly preliminaryDraftDetails = signal<PreliminaryDraft | null>(null);

  readonly approvedProposalDocument = computed<FormattedDocument | null>(() => {
    const evaluations = this.preliminaryDraftDetails()?.proposalData?.evaluations;
    return resolveApprovedEvaluationDocument(evaluations);
  });

  /**
   * Información registrada del anteproyecto: la de la propuesta, los
   * evaluadores, sus fechas (registro, límite de evaluación mientras está en
   * revisión y fecha máxima de entrega), la versión vigente y la respuesta
   * del Comité que aprobó la propuesta.
   */
  readonly view = computed<WorkDetailsView | null>(() => {
    const draft = this.preliminaryDraftDetails();
    if (!draft) return null;
    const vigente = versionVigente(draft);
    const respuestaComite = this.approvedProposalDocument();
    const evaluadores = draft.evaluators ?? [];
    return buildWorkDetailsView(draft.proposalData, {
      heading: 'Información del anteproyecto',
      state: draft.state,
      extraParticipants: [
        evaluadores.length ? { label: 'Evaluadores', value: evaluadores.map(fullName).join(' y ') } : null
      ],
      dates: [
        { label: 'Fecha de registro', date: draft.createdData },
        draft.state === stateList.EN_REVISION ? { label: 'Límite para la evaluación', date: draft.evaluationDeadline,
          hint: remainingDaysHint(draft.evaluationRemainingDays) } : null,
        { label: 'Fecha máxima de entrega del trabajo', date: draft.maximumDeliveryDate,
          hint: 'Plazo de ejecución fijado por el Consejo de Facultad' }
      ],
      documents: [
        vigente && { name: vigente.name, description: 'Versión vigente del anteproyecto', url: vigente.url },
        respuestaComite && { name: respuestaComite.name, description: 'Respuesta del Comité que aprobó la propuesta',
          url: respuestaComite.url }
      ]
    });
  });

  init(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');

    if (!preliminaryDraftId) {
      this.handleNavigationError();
      return;
    }

    this.preliminaryDraftService.getPreliminaryDraftById(preliminaryDraftId).subscribe({
      next: (foundData) => {
        if (foundData) {
          this.preliminaryDraftDetails.set(foundData);
        } else {
          this.showNotFoundNotification();
          this.goBack();
        }
      },
      error: (error) => {
        this.showErrorNotification();
        void this.router.navigate(['/preliminary-draft']);
        console.error('Error al recuperar detalles:', error);
      }
    });
  }

  async downloadDocument(targetDocument: WorkDetailsDocument): Promise<void> {
    if (!targetDocument?.url) {
      this.showDownloadFileErrorNotification();
      return;
    }
    this.showDownloadFileInfoNotification();
    try {
      await this.downloadService.download(targetDocument.url, targetDocument.name);
      this.showDownloadFileSuccessNotification();
    } catch (err) {
      console.error('Error al descargar el documento:', err);
      this.showDownloadFileErrorNotification();
    }
  }

  goBack(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/history')) {
      void this.router.navigate(['/history']);
    } else {
      void this.router.navigate(['/preliminary-draft']);
    }
  }

  navigateToEvaluations(): void {
    void this.router.navigate(['evaluations_performed'], { relativeTo: this.route });
  }

  navigateToDocuments(): void {
    void this.router.navigate(['loaded_documents'], { relativeTo: this.route });
  }

  private showDownloadFileSuccessNotification(): void {
    this.notificationService.show({
      title: 'Descarga exitosa',
      message: 'El documento se ha guardado en su equipo.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showDownloadFileInfoNotification(): void {
    this.notificationService.show({
      title: 'Iniciando transferencia',
      message: 'Estamos preparando el documento para la descarga...',
      type: NotificationType.INFO
    });
  }

  private showDownloadFileErrorNotification(): void {
    this.notificationService.show({
      title: 'Archivo no disponible',
      message: 'No se encontró el documento solicitado o no se pudo descargar.',
      type: NotificationType.ERROR
    });
  }

  private handleNavigationError(): void {
    this.notificationService.show({
      title: 'Identificador faltante',
      message: 'No se pudo cargar la información porque el ID del anteproyecto no es válido.',
      type: NotificationType.ERROR
    });
    this.goBack();
  }

  private showNotFoundNotification(): void {
    this.notificationService.show({
      title: 'Registro inexistente',
      message: 'El anteproyecto solicitado no se encuentra en nuestra base de datos.',
      type: NotificationType.ERROR
    });
  }

  private showErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de servidor',
      message: 'Hubo un problema al intentar conectar con el servicio de datos.',
      type: NotificationType.ERROR
    });
  }
}
