import { Injectable, inject } from '@angular/core';
import { EvaluationTableRow, RawEvaluationData } from '../models/evaluations-page.model';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { ThesisWork, SustentationRegistry, JurorVerdict, SpecialRequest } from '../../../../modules/thesis-work/interfaces/thesis-work.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../../modules/users/interfaces/user.interface';
import { Proposal } from '../../../../modules/proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../../../modules/preliminary-draft/interfaces/preliminary-draft.interface';
import { UserService } from '../../../../modules/users/services/user.service';

@Injectable({ providedIn: 'root' })
export class EvaluationsMapperService {

  private readonly userService = inject(UserService);

  public processProposalEvaluations(proposal: Proposal | undefined): EvaluationTableRow[] {
    if (!proposal) return [];
    return this.formatEvaluationsForTable(
      proposal.evaluations || [],
      proposal.documents || [],
      proposal.title
    );
  }

  public processDraftEvaluations(preliminaryDraft: PreliminaryDraft | undefined): EvaluationTableRow[] {
    if (!preliminaryDraft) return [];
    return this.formatEvaluationsForTable(
      preliminaryDraft.evaluations || [],
      preliminaryDraft.documents || [],
      preliminaryDraft.proposalData?.title || 'Anteproyecto'
    );
  }

  public processThesisEvaluations(thesisWork: ThesisWork | undefined): EvaluationTableRow[] {
    if (!thesisWork) return [];

    const defaultTitle = thesisWork.preliminaryDraftData?.proposalData?.title || 'Trabajo de Grado';
    const allDocuments = thesisWork.documents || [];
    const allEvaluations = thesisWork.evaluations || [];

    const parseSignedDocs = (
      docs: (string | Document | FormattedDocument)[] | undefined,
      fallbackName: string
    ): FormattedDocument[] => {
      return (docs || []).map(item => {
        if (typeof item === 'string') {
          const doc = allDocuments.find(document => document.url === item);

          // 👇 EL CAMBIO ESTÁ AQUÍ: Si no encuentra el documento, usamos 'item' como nombre
          // porque sabemos que el componente guarda el nombre del archivo directamente en el string.
          return {
            name: doc?.name || item,
            url: item
          };
        }
        return { name: item.name || fallbackName, url: item.url };
      });
    };

    const advanceEvaluations: RawEvaluationData[] = allEvaluations
      .filter(evaluation => !!evaluation.advanceId)
      .map(evaluation => {
        const advance = thesisWork.advances?.find(advance => advance.id === evaluation.advanceId);
        return {
          ...evaluation,
          documentTargetName: advance?.title || 'Avance',
          signedDocuments: parseSignedDocs(evaluation.signedDocuments, 'Evaluación de avance')
        };
      });

    const correctionEvaluations: RawEvaluationData[] = allEvaluations
      .filter(evaluation => !evaluation.advanceId)
      .map(evaluation => ({
        ...evaluation,
        documentTargetName: 'Documentos corregidos',
        signedDocuments: parseSignedDocs(evaluation.signedDocuments, 'Formato de evaluación')
      }));

    const verdictEvaluations: RawEvaluationData[] = [];
    (thesisWork.sustentations ?? []).forEach((sustentation: SustentationRegistry) => {
      (sustentation.verdicts ?? []).forEach((verdict: JurorVerdict) => {
        if (verdict.attachedDocument?.type === DocumentType.CORRECCION) return;

        const juror = sustentation.assignedJurors?.find((juror: User) => juror.id === verdict.jurorId);
        const jurorName = juror ? `${juror.firstName ?? ''} ${juror.lastName ?? ''}`.trim() : 'Jurado Evaluador';
        const realDocumentName = verdict.attachedDocument?.name || 'Acta de Sustentación';

        verdictEvaluations.push({
          id: `verdict-${verdict.jurorId}-${sustentation.id}`,
          evaluatorId: verdict.jurorId,
          evaluatorName: jurorName,
          evaluatorRole: 'Jurado',
          veredict: verdict.veredict,
          observations: verdict.observations || 'Sin observaciones registradas.',
          date: verdict.evaluationDate,
          documentTargetName: realDocumentName,
          signedDocuments: verdict.attachedDocument ? [{ name: realDocumentName, url: verdict.attachedDocument.url }] : [],
        });
      });
    });

    const specialRequestsEvaluations: RawEvaluationData[] = (thesisWork.specialRequests || [])
      .filter((request: SpecialRequest) => request.status !== stateList.EN_REVISION)
      .map((request: SpecialRequest) => {
        const formattedType = request.requestType.replace(/_/g, ' ').toLowerCase();
        const capitalizedType = formattedType.charAt(0).toUpperCase() + formattedType.slice(1);

        // --- CAMBIO: Usamos el historial inmutable ---
        // Ya no buscamos un usuario aleatorio del consejo.
        // Usamos el ID que el servicio de SpecialRequest guardó en el momento exacto de la evaluación.
        const historicalEvaluatorId = request.evaluatorId || 'consejo-facultad';

        return {
          id: request.id,
          evaluatorId: historicalEvaluatorId, // Pasamos el ID real de quien resolvió
          evaluatorName: 'Consejo de Facultad', // Se sobrescribirá más abajo usando el UserService
          evaluatorRole: 'Consejo',
          veredict: request.status,
          observations: request.resolutionDetails || 'Sin detalles de resolución registrados.',
          date: request.requestDate, // La fecha original en la que se evaluó/creó
          documentTargetName: `Solicitud Especial (${capitalizedType})`,
          signedDocuments: []
        };
      });

    return this.formatEvaluationsForTable(
      [...advanceEvaluations, ...correctionEvaluations, ...verdictEvaluations, ...specialRequestsEvaluations],
      allDocuments,
      defaultTitle
    );
  }

  private formatEvaluationsForTable(
    evaluations: RawEvaluationData[],
    globalDocuments: Document[],
    defaultTitle: string
  ): EvaluationTableRow[] {
    return evaluations.map(evaluation => {
      const targetDocument = globalDocuments.find(document => document.id === evaluation.documentId);

      const isCouncil = evaluation.evaluatorName?.toLowerCase().includes('consejo') || evaluation.evaluatorRole === 'Consejo';

      // --- CAMBIO: Obtener el nombre real validando la respuesta del servicio ---
      let realName = evaluation.evaluatorName;
      if (evaluation.evaluatorId && evaluation.evaluatorId !== 'consejo-facultad') {
        const userFound = this.userService.getUserFullName(evaluation.evaluatorId);
        // Validamos que el servicio no nos haya devuelto el mismo ID o 'No asignado'
        if (userFound && userFound.trim() !== '' && userFound !== 'No asignado' && userFound !== evaluation.evaluatorId) {
          realName = userFound;
        }
      }

      const evaluatorName = realName || (isCouncil ? 'Representante del Consejo' : 'Evaluador');

      // --- CAMBIO: Estandarización estricta de mayúsculas/minúsculas para el Rol ---
      let rawRole = evaluation.evaluatorRole || (isCouncil ? 'Consejo' : 'Evaluador');
      const evaluatorRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

      let docName = evaluation.documentTargetName || targetDocument?.name;
      if (!docName) {
        if (isCouncil) {
          docName = globalDocuments.find(document => document.type === DocumentType.FORMATO_C)?.name ?? 'Presentación al consejo de facultad';
        } else {
          docName = globalDocuments.find(document => document.type === DocumentType.FORMATO_B)?.name ?? defaultTitle;
        }
      }

      let docsForModal: FormattedDocument[] = [];
      if (evaluation.signedDocuments?.length) {
        docsForModal = evaluation.signedDocuments.map(document => {
          if (typeof document === 'string') return { name: document, url: document };
          return { name: document.name, url: document.url };
        });
      } else if (targetDocument) {
        docsForModal = [{ name: targetDocument.name, url: targetDocument.url }];
      }

      return {
        id: evaluation.id || crypto.randomUUID(),
        evaluatorId: evaluation.evaluatorId || '',
        evaluatorName,
        evaluatorRole, // Siempre será "Jurado", "Consejo", etc. (solo primera en mayúscula)
        veredict: evaluation.veredict as stateList,
        observations: evaluation.observations || evaluation.comments || 'Sin observaciones registradas.',
        date: evaluation.date || new Date(),
        documentTargetName: docName,
        signedDocuments: docsForModal,
        allowedActions: ['view_details']
      };
    });
  }
}
