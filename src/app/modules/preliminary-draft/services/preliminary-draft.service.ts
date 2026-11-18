import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { PreliminaryDraftApiService } from './preliminary-draft-api.service';
import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService, ResultadoConceptoEvaluador } from './preliminary-draft-document.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';

/**
 * Fachada del módulo de anteproyectos: reúne el almacén, las llamadas al backend, la asignación de
 * evaluadores y los documentos.
 */
@Injectable({ providedIn: 'root' })
export class PreliminaryDraftService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly api = inject(PreliminaryDraftApiService);
  private readonly assignment = inject(PreliminaryDraftAssignmentService);
  private readonly document = inject(PreliminaryDraftDocumentService);

  /** Anteproyectos activos visibles para el usuario. */
  readonly preliminaryDrafts = this.storage.preliminaryDrafts;
  /** Todos los anteproyectos del almacén, también los archivados. */
  readonly allPreliminaryDrafts = this.storage.allPreliminaryDrafts;

  /** Anteproyecto por id, de memoria o del backend. */
  getPreliminaryDraftById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.api.getPreliminaryDraftById(id);
  }

  /** Registra el anteproyecto con su primera versión. */
  createPreliminaryDraft(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.api.createPreliminaryDraft(preliminaryDraft);
  }

  /** Corrige el anteproyecto y, si trae un PDF nuevo, radica una nueva versión. */
  updatePreliminaryDraft(id: string, updatedData: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.api.updatePreliminaryDraft(id, updatedData);
  }

  /** Anula el trabajo del anteproyecto. */
  annulDraft(id: string, justification: string): Observable<void> {
    return this.api.annulDraft(id, justification);
  }

  /** @returns el primer error de la asignación de evaluadores, o null */
  validateReviewersRules(
    originalProposal: Proposal,
    evaluator1Id: string,
    evaluator2Id: string
  ): string | null {
    return this.assignment.validateReviewersRules(originalProposal, evaluator1Id, evaluator2Id);
  }

  /** Asigna los dos evaluadores del anteproyecto. */
  assignReviewers(
    preliminaryDraftId: string,
    evaluatorsIds: string[]
  ): Observable<void> {
    return this.assignment.assignReviewers(preliminaryDraftId, evaluatorsIds);
  }

  /** Concepto de un evaluador (APROBADO o CON_CORRECCIONES) con el formato B y anotaciones opcionales. */
  registerEvaluatorConcept(
    preliminaryDraftId: string,
    resultado: ResultadoConceptoEvaluador,
    observaciones: string,
    formatoB: File | null,
    anotaciones?: File | null
  ): Observable<PreliminaryDraft> {
    return this.document.registerEvaluatorConcept(preliminaryDraftId, resultado, observaciones, formatoB, anotaciones);
  }

  /** Nueva versión del anteproyecto tras las correcciones. */
  uploadCorrection(preliminaryDraftId: string, file: File): Observable<PreliminaryDraft> {
    return this.document.uploadCorrection(preliminaryDraftId, file);
  }

  /** El Jefe de departamento remite al Consejo con el formato C. */
  uploadCouncilPresentation(preliminaryDraftId: string, file: File): Observable<PreliminaryDraft> {
    return this.document.uploadCouncilPresentation(preliminaryDraftId, file);
  }

  /** Decisión del Consejo de Facultad con la resolución. */
  registerCouncilDecision(
    preliminaryDraftId: string,
    veredict: stateList,
    observaciones: string,
    resolucion: File,
    startDate: Date | null = null,
    endDate: Date | null = null
  ): Observable<PreliminaryDraft> {
    return this.document.registerCouncilDecision(preliminaryDraftId, veredict, observaciones, resolucion,
      startDate, endDate);
  }
}
