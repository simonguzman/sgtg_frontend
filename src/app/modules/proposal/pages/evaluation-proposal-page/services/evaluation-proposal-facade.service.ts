import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { cartaDeAceptacion, versionEnRevision } from '../../../services/proposal-rules.service';
import { SaveProposalEvaluationEvent } from '../../../interfaces/evaluation-proposal-payload.interface';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';

export type { SaveProposalEvaluationEvent };

const RESULT_TO_STATE: Record<string, stateList> = {
  'Pertinente': stateList.PERTINENTE,
  'No pertinente': stateList.NO_PERTINENTE
};

@Injectable({ providedIn: 'root' })
export class EvaluationProposalFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);

  public load(
    id: string,
    onSuccess: (proposal: Proposal) => void,
    onNotFound: () => void
  ): void {
    this.proposalService.getProposalById(id)
      .pipe(first())
      .subscribe({
        next: (data) => data ? onSuccess(data) : onNotFound(),
        error: () => onNotFound()
      });
  }

  public async downloadOriginalDocument(proposal: Proposal): Promise<void> {
    // Se descarga la versión que el Comité evalúa (En revisión), no la primera radicada
    const document = versionEnRevision(proposal);
    if (!document?.url?.trim()) {
      this.showNotification(
        'Error de descarga',
        'No se pudo obtener el documento original. Contacte a soporte técnico.',
        NotificationType.ERROR
      );
      return;
    }
    this.showNotification(
      'Descarga iniciada',
      'Descargando la propuesta original para su revisión...',
      NotificationType.INFO
    );
    try {
      await this.downloadService.download(document.url, document.name);
    } catch (err) {
      console.error('Error al descargar el documento original:', err);
      this.showNotification('Error de descarga', 'No se pudo descargar el documento. Intente más tarde.', NotificationType.ERROR);
    }
  }

  /** Descarga la carta de aceptación de la organización (práctica profesional). */
  public async downloadAcceptanceLetter(proposal: Proposal): Promise<void> {
    const document = cartaDeAceptacion(proposal);
    if (!document?.url?.trim()) {
      this.showNotification('Error de descarga', 'No se pudo obtener la carta de aceptación.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(document.url, document.name);
    } catch (err) {
      console.error('Error al descargar la carta de aceptación:', err);
      this.showNotification('Error de descarga', 'No se pudo descargar el documento. Intente más tarde.', NotificationType.ERROR);
    }
  }

  public async saveEvaluation(
    event: SaveProposalEvaluationEvent,
    proposal: Proposal,
    route: ActivatedRoute,
    onError: () => void
  ): Promise<void> {
    const veredict = RESULT_TO_STATE[event.result];
    if (!proposal.id || !veredict) {
      this.showNotification(
        'Error de servidor',
        'Hubo un problema al guardar la evaluación. Intente nuevamente en unos minutos.',
        NotificationType.ERROR
      );
      onError();
      return;
    }

    this.proposalService.registerCommitteeDecision(proposal.id, veredict, event.comments, event.file)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Evaluación registrada',
            'La decisión del comité ha sido guardada y el estado de la propuesta actualizado.',
            NotificationType.CONFIRMATION
          );
          this.navigation.back(() => this.router.navigate(['../'], { relativeTo: route }));
        },
        error: (err) => {
          this.showNotification(
            'Error al guardar la evaluación',
            apiErrorMessage(err, 'Hubo un problema al guardar la evaluación. Intente nuevamente en unos minutos.'),
            NotificationType.ERROR
          );
          onError();
        }
      });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
