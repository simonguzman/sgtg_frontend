import { inject, Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkDetailsView } from '../models/thesis-work-details-page.model';
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
      mainDocument: this.extractMainDocument(thesisWork)
    };
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
