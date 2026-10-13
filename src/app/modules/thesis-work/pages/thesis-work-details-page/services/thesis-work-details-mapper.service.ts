import { inject, Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkDeadlineItem, ThesisWorkDetailsView } from '../models/thesis-work-details-page.model';
import { UserService } from '../../../../users/services/user.service';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

@Injectable({ providedIn: 'root' })
export class ThesisWorkDetailsMapperService {
  private readonly userService = inject(UserService);

  public mapToView(thesisWork: ThesisWork): ThesisWorkDetailsView {
    const proposal = thesisWork.preliminaryDraftData?.proposalData;

    return {
      id: thesisWork.thesisWorkId || '',
      title: proposal?.title || 'Sin título',
      description: proposal?.description || 'Sin descripción disponible.',
      modality: proposal?.modality || 'No definida',
      state: thesisWork.state,
      participants: {
        authors: this.userService.getAuthorsNames(proposal?.authors),
        director: this.userService.getUserFullName(proposal?.director?.id),
        codirector: proposal?.codirector ? this.userService.getUserFullName(proposal.codirector.id) : undefined,
        advisor: proposal?.advisor ? this.userService.getUserFullName(proposal.advisor.id) : undefined,
      },
      deadlines: this.mapDeadlines(thesisWork),
      mainDocument: this.extractMainDocument(thesisWork)
    };
  }

  /** Fechas del backend que aplican al trabajo (las que ya no aplican llegan vacías). */
  private mapDeadlines(thesisWork: ThesisWork): ThesisWorkDeadlineItem[] {
    const deadlines = thesisWork.deadlines;
    if (!deadlines) return [];
    const items: (ThesisWorkDeadlineItem | null)[] = [
      deadlines.startDate ? { label: 'Inicio del trabajo', date: deadlines.startDate,
        hint: 'Notificación de la aprobación del anteproyecto' } : null,
      deadlines.maximumDeliveryDate ? { label: 'Fecha máxima de entrega', date: deadlines.maximumDeliveryDate,
        hint: 'Incluye la prórroga y el tiempo de suspensión, si los hubo' } : null,
      deadlines.minimumSustentationDate ? { label: 'Sustentación desde', date: deadlines.minimumSustentationDate,
        hint: 'Primera fecha en la que se puede solicitar la sustentación' } : null,
      deadlines.objectivesChangeDeadline ? { label: 'Límite para cambiar título y objetivos',
        date: deadlines.objectivesChangeDeadline } : null,
      deadlines.extensionRequestDeadline ? { label: 'Límite para solicitar prórroga',
        date: deadlines.extensionRequestDeadline } : null
    ];
    return items.filter((item): item is ThesisWorkDeadlineItem => item !== null);
  }

  private extractMainDocument(thesisWork: ThesisWork): { name: string; url: string; description: string } | null {
    const preliminaryDraft = thesisWork.preliminaryDraftData;
    if (!preliminaryDraft) return null;

    const defaultDescription = 'Resolución original del anteproyecto aprobado';
    const evaluations = preliminaryDraft.evaluations || [];

    const consejoEvaluations = evaluations.filter(evaluation => evaluation.evaluatorRole?.toUpperCase().includes('CONSEJO'));
    const lastConsejoEval = consejoEvaluations.at(-1);

    if (lastConsejoEval?.signedDocuments?.length) {
      const resolutionDoc = lastConsejoEval.signedDocuments.at(-1);

      if (resolutionDoc) {
        return {
          name: resolutionDoc.name,
          url: resolutionDoc.url,
          description: defaultDescription
        };
      }
    }

    const resolutionInDraft = (preliminaryDraft.documents || []).find(document => document.type === DocumentType.RESOLUCION);
    if (resolutionInDraft) {
      return {
        name: resolutionInDraft.name,
        url: resolutionInDraft.url,
        description: defaultDescription
      };
    }

    const directDocs = thesisWork.documents || [];
    const finalDoc = directDocs.find(document => document.type === DocumentType.RESOLUCION);

    return finalDoc ? {
      name: finalDoc.name,
      url: finalDoc.url,
      description: defaultDescription
    } : null;
  }
}
