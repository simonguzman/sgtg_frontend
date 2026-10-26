import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ProposalService } from '../../../services/proposal.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { Proposal } from '../../../interfaces/proposal.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { versionActual, versionesDePropuesta } from '../../../services/proposal-rules.service';
import { buildWorkDetailsView, remainingDaysHint } from '../../../../../shared/components/work-details/work-details.builder';
import { WorkDetailsDocument, WorkDetailsView } from '../../../../../shared/components/work-details/work-details.model';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';

@Injectable({ providedIn: 'root' })
export class ProposalDetailsFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);

  public load(
    id: string,
    onSuccess:  (proposal: Proposal) => void,
    onNotFound: () => void,
    onError: () => void
  ): void {
    this.proposalService.getProposalById(id).subscribe({
      next: (data) => {
        if (data) {
          onSuccess(data);
        } else {
          this.showNotification(
            'Propuesta no encontrada',
            'No se pudo encontrar la información de la propuesta solicitada.',
            NotificationType.ERROR
          );
          onNotFound();
        }
      },
      error: (err) => {
        console.error(err);
        this.showNotification(
          'Error de comunicación',
          'Hubo un problema al conectar con el servidor. Intente más tarde.',
          NotificationType.ERROR
        );
        onError();
      }
    });
  }

  public handleMissingId(onNavigate: () => void): void {
    this.showNotification(
      'Acceso inválido',
      'No se proporcionó un identificador válido para ver la propuesta.',
      NotificationType.ERROR
    );
    onNavigate();
  }

  public goBack(): void {
    this.navigation.back(() => {
      const currentUrl = this.router.url;
      this.router.navigate([currentUrl.includes('/history') ? '/history' : '/proposal']);
    });
  }

  /**
   * Información registrada de la propuesta: datos y participantes, fecha de
   * registro, plazo del Comité mientras está en revisión, el formato A vigente
   * y la carta de aceptación (práctica profesional).
   */
  public buildView(proposal: Proposal): WorkDetailsView {
    const versionVigente = versionActual(proposal);
    const otros = proposal.documents.filter(document => !versionesDePropuesta(proposal).includes(document));
    const enRevision = proposal.state === stateList.EN_REVISION;
    return buildWorkDetailsView(proposal, {
      heading: 'Información de la propuesta',
      state: proposal.state,
      dates: [
        { label: 'Fecha de registro', date: proposal.createdAt },
        enRevision ? { label: 'Límite para el concepto del Comité', date: proposal.evaluationDeadline,
          hint: remainingDaysHint(proposal.evaluationRemainingDays) } : null
      ],
      documents: [
        versionVigente && { name: versionVigente.name, description: 'Versión vigente del formato A', url: versionVigente.url },
        ...otros.map(document => ({ name: document.name, description: 'Documento radicado con la propuesta', url: document.url }))
      ]
    });
  }

  public async downloadDocument(document: WorkDetailsDocument): Promise<void> {
    try {
      await this.downloadService.download(document.url, document.name);
    } catch (err) {
      console.error('Error al descargar el documento:', err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`,
        NotificationType.ERROR);
    }
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
