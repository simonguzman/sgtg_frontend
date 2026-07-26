import { inject, Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkDetailsView } from '../models/thesis-work-details-page.model';
import { UserService } from '../../../../users/services/user.service';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

@Injectable({ providedIn: 'root' })
export class ThesisWorkDetailsMapperService {
  private readonly userService = inject(UserService);

  public mapToView(work: ThesisWork): ThesisWorkDetailsView {
    const proposal = work.preliminaryDraftData?.proposalData;

    return {
      id: work.thesisWorkId || '',
      title: proposal?.title || 'Sin título',
      description: proposal?.description || 'Sin descripción disponible.',
      modality: proposal?.modality || 'No definida',
      state: work.state,
      participants: {
        authors: this.userService.getAuthorsNames(proposal?.authors),
        director: this.userService.getUserFullName(proposal?.director?.id),
        codirector: proposal?.codirector ? this.userService.getUserFullName(proposal.codirector.id) : undefined,
        advisor: proposal?.advisor ? this.userService.getUserFullName(proposal.advisor.id) : undefined,
      },
      mainDocument: this.extractMainDocument(work)
    };
  }

  private extractMainDocument(work: ThesisWork): { name: string; url: string; description: string } | null {
    const preliminaryDraft = work.preliminaryDraftData;
    if (!preliminaryDraft) return null;

    const defaultDescription = 'Resolución original del anteproyecto aprobado';
    const evaluations = preliminaryDraft.evaluations || [];

    // 1. Buscar en evaluaciones del consejo
    const consejoEvaluations = evaluations.filter(e => e.evaluatorRole?.toUpperCase().includes('CONSEJO'));
    if (consejoEvaluations.length > 0) {
      const lastConsejoEval = consejoEvaluations[consejoEvaluations.length - 1];
      if (lastConsejoEval.signedDocuments && lastConsejoEval.signedDocuments.length > 0) {
        const resolutionUrl = lastConsejoEval.signedDocuments[lastConsejoEval.signedDocuments.length - 1];
        const allSystemDocs = [...(preliminaryDraft.documents || []), ...(work.documents || [])];

        const exactDocument = allSystemDocs.find(doc => doc.url === resolutionUrl && doc.id !== lastConsejoEval.documentId);
        if (exactDocument) {
          return { name: exactDocument.name, url: exactDocument.url, description: defaultDescription };
        }

        return { name: this.extractFileNameFromUrl(resolutionUrl), url: resolutionUrl, description: defaultDescription };
      }
    }

    // 2. Buscar en documentos del anteproyecto
    const resolutionInDraft = (preliminaryDraft.documents || []).find(doc => doc.type === DocumentType.RESOLUCION);
    if (resolutionInDraft) {
      return { name: resolutionInDraft.name, url: resolutionInDraft.url, description: defaultDescription };
    }

    // 3. Buscar en documentos directos del trabajo
    const directDocs = work.documents || [];
    const finalDoc = directDocs.find(doc => doc.type === DocumentType.RESOLUCION);

    return finalDoc ? { name: finalDoc.name, url: finalDoc.url, description: defaultDescription } : null;
  }

  private extractFileNameFromUrl(url: string): string {
    let realName = 'Resolucion_Aprobacion_Consejo.pdf';
    try {
      const decodedUrl = decodeURIComponent(url);
      let fileNameFromUrl = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1).split('?')[0];
      if (fileNameFromUrl.includes('%2F')) {
        fileNameFromUrl = fileNameFromUrl.substring(fileNameFromUrl.lastIndexOf('%2F') + 3);
      }
      if (fileNameFromUrl && fileNameFromUrl.trim() !== '') {
        realName = fileNameFromUrl;
      }
    } catch (error) {
      console.warn('No se pudo procesar el nombre real desde la URL.', error);
    }
    return realName;
  }
}
