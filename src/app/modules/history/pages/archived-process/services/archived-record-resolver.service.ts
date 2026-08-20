import { inject, Injectable } from '@angular/core';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FinalDelivery } from '../../../../thesis-work/interfaces/final-delivery.interface';
import { Advance } from '../../../../thesis-work/interfaces/advance.interface';
import { ArchivedBaseProposal } from '../../../interfaces/archived-base-proposal.interface';

export type ArchivedRecordType = 'propuestas' | 'anteproyectos' | 'trabajos';

export interface ArchivedRecordResolution {
  state: string;
  baseProposal: ArchivedBaseProposal;
  documents: FileDocument[];
}

@Injectable({ providedIn: 'root' })
export class ArchivedRecordResolverService {
  private readonly proposalService = inject(ProposalService);
  private readonly draftService = inject(PreliminaryDraftService);
  private readonly thesisService = inject(ThesisWorkService);

  resolve(type: ArchivedRecordType, id: string): ArchivedRecordResolution | null {
    switch (type) {
      case 'propuestas':    return this.resolveProposal(id);
      case 'anteproyectos': return this.resolveDraft(id);
      case 'trabajos':      return this.resolveThesisWork(id);
      default:              return null;
    }
  }

  private resolveProposal(id: string): ArchivedRecordResolution | null {
    const proposal = this.proposalService.allProposals().find(p => p.id === id);
    if (!proposal) return null;
    return {
      state: proposal.state,
      baseProposal: proposal,
      documents: proposal.documents ?? []
    };
  }

  private resolveDraft(id: string): ArchivedRecordResolution | null {
    const draft = this.draftService.allPreliminaryDrafts().find(d => d.preliminaryDraftId === id);
    if (!draft) return null;
    return {
      state: draft.state,
      baseProposal: draft.proposalData ?? {},
      documents: draft.documents ?? []
    };
  }

  private resolveThesisWork(id: string): ArchivedRecordResolution | null {
    const work = this.thesisService.allThesisWorks().find(t => t.thesisWorkId === id);
    if (!work) return null;
    return {
      state: work.state,
      baseProposal: work.preliminaryDraftData?.proposalData ?? {},
      // ← FIX: se agrega work.advances como tercera fuente de documentos.
      // Confirmado contra ThesisWorkAdvanceService.uploadDocumentMock:
      // los documentos de tipo AVANCE nunca se agregan a thesisWork.documents
      // — solo existen dentro de advances[].documents. Sin este fix, un
      // trabajo de grado archivado por vencimiento de plazo (sin entrega
      // final, pero posiblemente con varios avances subidos) mostraba la
      // sección de documentos vacía, aunque sí existiera evidencia real.
      //
      // Confirmado SIN cambios necesarios: correctedDeliveries y pazYSalvos
      // no requieren extracción aparte — ThesisWorkDeliveryService ya
      // empuja esos mismos FileDocument tanto a su array estructurado
      // como al array plano `documents` (uploadCorrectedDocumentsMock,
      // registerPazYSalvoMock), así que ya llegan aquí sin duplicar lógica.
      documents: this.extractThesisWorkDocuments(work.documents, work.finalDeliveries, work.advances)
    };
  }

  private extractThesisWorkDocuments(
    documents: FileDocument[] | undefined,
    finalDeliveries: FinalDelivery[] | undefined,
    advances: Advance[] | undefined
  ): FileDocument[] {
    const docs: FileDocument[] = [...(documents ?? [])];
    const seenIds = new Set(docs.map(d => d.id));

    finalDeliveries?.forEach(delivery => {
      [delivery.monograph, delivery.formatE, delivery.annexes].forEach(doc => {
        if (doc && !seenIds.has(doc.id)) {
          docs.push(doc);
          seenIds.add(doc.id);
        }
      });
    });

    // ← NUEVO: mismo patrón de deduplicación por id ya usado arriba para
    // finalDeliveries — insurance barata, ningún id debería colisionar en
    // la práctica (todos crypto.randomUUID()), pero es consistente y
    // defensivo si el modelo de datos cambia en el futuro.
    advances?.forEach(advance => {
      advance.documents?.forEach(doc => {
        if (doc && !seenIds.has(doc.id)) {
          docs.push(doc);
          seenIds.add(doc.id);
        }
      });
    });

    return docs;
  }
}
