import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, tap } from 'rxjs';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { Document } from '../../../core/interfaces/Document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { addBusinessDays } from '../../../core/utils/date-utils';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryDraftDocumentService {
  private readonly storage = inject(PreliminaryDraftStorageService);

  /**
   * Registra una evaluación de un jurado y recalcula el estado dinámico del anteproyecto.
   */
  addEvaluationMock(preliminaryDraftId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateDraft(preliminaryDraftId, (draft) => {
          const newEvaluations = [evaluation, ...(draft.evaluations || [])];
          return {
            ...draft,
            evaluations: newEvaluations,
            state: this.calculatePreliminaryDraftState(draft, newEvaluations)
          };
        });
      })
    );
  }

  /**
   * Añade un nuevo documento (Versión inicial o Corrección) al historial.
   */
  uploadDocumentMock(preliminaryDraftId: string, document: Document): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        const renewedDeadLine = addBusinessDays(new Date(), 10);
        this.storage.updateDraft(preliminaryDraftId, (draft) => ({
          ...draft,
          documents: [document, ...(draft.documents || [])],
          state: stateList.EN_REVISION,
          evaluationDeadline: renewedDeadLine,
        }));
      })
    );
  }

  /**
   * Sube el acta/formato final de resolución emitido por el consejo de facultad.
   */
  uploadCouncilResolutionMock(id: string, document: Document, state: stateList, evaluation: Evaluation): Observable<PreliminaryDraft | undefined> {
    return this.storage.getById(id).pipe(
      map(draft => {
        if (draft) {
          const updatedDraft = {
            ...draft,
            documents: [...(draft.documents || []), document],
            state: state,
            evaluations: [...(draft.evaluations || []), evaluation]
          };
          this.storage.updateDraft(id, () => updatedDraft);
          return updatedDraft;
        }
        return undefined;
      })
    );
  }

  /**
   * Calcula el estado visual detallado de un documento específico esperando a todos los jurados.
   */
  calculateDocumentStatus(documentId: string, evaluations: Evaluation[], totalEvaluators: number): stateList {
    const documentEvaluations = evaluations?.filter(ev => ev.documentId === documentId) || [];

    // 1. Si aún faltan jurados por evaluar, el documento sigue en revisión obligatoriamente.
    if (documentEvaluations.length < totalEvaluators) {
      return stateList.EN_REVISION;
    }

    // 2. Una vez que todos han evaluado, revisamos si hay algún rechazo.
    if (documentEvaluations.some(ev => ev.veredict === stateList.NO_APROBADO)) {
      return stateList.NO_APROBADO;
    }

    // 3. Si todos evaluaron y no hay rechazos, se aprueba.
    return stateList.APROBADO;
  }

  /**
   * Calcula el estado general del anteproyecto esperando a todos los evaluadores asignados.
   */
  private calculatePreliminaryDraftState(preliminaryDraft: PreliminaryDraft, evaluations: Evaluation[]): stateList {
    const lastDocumentId = preliminaryDraft.documents[0]?.id;
    if (!lastDocumentId) return stateList.EN_REVISION;

    const currentVersionEvaluations = evaluations.filter(ev => ev.documentId === lastDocumentId);

    // Obtenemos la cantidad de evaluadores asignados (por defecto 2 si no viene en el arreglo)
    const totalAssignedEvaluators = preliminaryDraft.evaluators?.length || 2;

    // 1. Mientras las evaluaciones emitidas sean menores a los evaluadores, seguimos en revisión
    if (currentVersionEvaluations.length < totalAssignedEvaluators) {
      return stateList.EN_REVISION;
    }

    // 2. Solo cuando TODOS hayan evaluado, sacamos la conclusión final
    const hasRejection = currentVersionEvaluations.some(ev => ev.veredict === stateList.NO_APROBADO);
    if (hasRejection) return stateList.NO_APROBADO;

    return stateList.APROBADO;
  }
}
