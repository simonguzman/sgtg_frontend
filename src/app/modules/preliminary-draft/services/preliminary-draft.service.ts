import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { PreliminaryDraftApiService } from './preliminary-draft-api.service';
import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService, ResultadoConceptoEvaluador } from './preliminary-draft-document.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly api = inject(PreliminaryDraftApiService);
  private readonly assignment = inject(PreliminaryDraftAssignmentService);
  private readonly document = inject(PreliminaryDraftDocumentService);

  // ── Estado reactivo (Signals) ──────────────────────────────────────────────
  readonly preliminaryDrafts = this.storage.preliminaryDrafts;
  readonly allPreliminaryDrafts = this.storage.allPreliminaryDrafts;

  // ── CRUD ───────────────────────────────────────────────────────────────────
  getPreliminaryDraftById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.api.getPreliminaryDraftById(id);
  }

  createPreliminaryDraft(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.api.createPreliminaryDraft(preliminaryDraft);
  }

  updatePreliminaryDraft(id: string, updatedData: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.api.updatePreliminaryDraft(id, updatedData);
  }

  annulDraft(id: string, justification: string): Observable<void> {
    return this.api.annulDraft(id, justification);
  }

  // ── Asignación ─────────────────────────────────────────────────────────────
  validateReviewersRules(
    originalProposal: Proposal,
    evaluator1Id: string,
    evaluator2Id: string
  ): string | null {
    return this.assignment.validateReviewersRules(originalProposal, evaluator1Id, evaluator2Id);
  }

  assignReviewers(
    preliminaryDraftId: string,
    evaluatorsIds: string[]
  ): Observable<void> {
    return this.assignment.assignReviewers(preliminaryDraftId, evaluatorsIds);
  }

  // ── Documentos y evaluaciones ──────────────────────────────────────────────
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
    resolucion: File
  ): Observable<PreliminaryDraft> {
    return this.document.registerCouncilDecision(preliminaryDraftId, veredict, observaciones, resolucion);
  }

  calculateDocumentStatus(
    documentId: string,
    evaluations: Evaluation[],
    totalEvaluators: number
  ): stateList {
    return this.document.calculateDocumentStatus(documentId, evaluations, totalEvaluators);
  }
}
