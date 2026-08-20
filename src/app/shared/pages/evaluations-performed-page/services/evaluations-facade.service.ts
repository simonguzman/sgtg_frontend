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

@Injectable({ providedIn: 'root' })
export class EvaluationsFacadeService {
  private readonly mapper = inject(EvaluationsMapperService);
  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);
  // ← Nuevas dependencias: antes vivían directo en el componente.
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
    return mappedEvaluations.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // ← NUEVO: movido desde el componente + mismo patrón async/try-catch
  // que ya aplicamos en LoadedProposalsFacadeService y
  // LoadedDocumentsPreliminaryDraftFacadeService. Este cambio por sí
  // solo NO resuelve el "descarga algo pero no abre" — eso depende de
  // que la URL guardada sea real, y eso se decide upstream, no aquí.
  // Lo que sí corrige es que antes el error de descarga (si
  // downloadService alguna vez lo propaga) se perdía silenciosamente.
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
