import { Injectable, inject } from '@angular/core';
import { EvaluationsMapperService } from './evaluations-mapper.service';
import { ProposalService } from '../../../../modules/proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../../modules/preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../../modules/thesis-work/services/thesis-work.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';
import { EvaluationTableRow } from '../models/evaluations-page.model';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { ThesisWork } from '../../../../modules/thesis-work/interfaces/thesis-work.interface';

/** Momento de la fecha; una fecha inválida va al final */
const tiempo = (fecha: Date | string | undefined): number => {
  const valor = fecha ? new Date(fecha).getTime() : NaN;
  return Number.isNaN(valor) ? 0 : valor;
};

@Injectable({ providedIn: 'root' })
export class EvaluationsFacadeService {
  private readonly mapper = inject(EvaluationsMapperService);
  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public getMappedEvaluations(id: string, currentUrl: string): EvaluationTableRow[] {
    let mappedEvaluations: EvaluationTableRow[] = [];
    if (currentUrl.includes('proposal')) {
      const proposal = this.proposalService.allProposals().find(proposal => proposal.id === id);
      mappedEvaluations = this.mapper.processProposalEvaluations(proposal);
    } else if (currentUrl.includes('preliminary-draft')) {
      const preliminaryDraft = this.preliminaryDraftService.allPreliminaryDrafts().find(preliminaryDraft => preliminaryDraft.preliminaryDraftId === id);
      mappedEvaluations = this.mapper.processDraftEvaluations(preliminaryDraft);
    } else if (currentUrl.includes('thesis')) {
      const thesis = this.thesisWorkService.allThesisWorks().find((t: ThesisWork) => t.thesisWorkId === id);
      if (thesis) {
        mappedEvaluations = this.mapper.processThesisEvaluations(thesis);
      }
    }
    // La más reciente primero. Las fechas no tienen hora: entre las del mismo día va primero la última
    // registrada (los mappers las entregan en el orden en que se registraron)
    return [...mappedEvaluations].reverse().sort((a, b) => tiempo(b.date) - tiempo(a.date));
  }

  public async handleDownload(document: FormattedDocument): Promise<void> {
    if (!document.url?.trim()) {
      this.showNotification('Error', 'No se pudo localizar el documento.', NotificationType.ERROR);
      return;
    }

    this.showNotification('Descarga', 'Iniciando descarga...', NotificationType.INFO);

    try {
      await this.downloadService.download(document.url, document.name);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
