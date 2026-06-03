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
   * Registra una evaluación de un jurado.
   * Se modificó para mantener intacto el estado general del anteproyecto (stateList.EN_REVISION),
   * evitando mutaciones prematuras antes de la decisión del Consejo de Facultad.
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
            // 🔒 Preservamos el estado actual del anteproyecto sin alterarlo automáticamente
            state: draft.state
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
   * Este método sigue siendo el único responsable de consolidar el cambio de estado definitivo
   * y ahora también registra opcionalmente la fecha máxima de entrega del trabajo de grado.
   */
  uploadCouncilResolutionMock(
    id: string,
    document: Document,
    state: stateList,
    evaluation: Evaluation,
    maximumDeliveryDate?: Date | string // 👈 1. Añadimos el nuevo parámetro manual
  ): Observable<PreliminaryDraft | undefined> {
    return this.storage.getById(id).pipe(
      map(draft => {
        if (draft) {
          const updatedDraft: PreliminaryDraft = {
            ...draft,
            documents: [...(draft.documents || []), document],
            state: state, // Aquí es donde se asigna el APROBADO o NO_APROBADO final del Consejo
            evaluations: [...(draft.evaluations || []), evaluation],
            // 👈 2. Lógica condicional: Solo persistimos la fecha si el veredicto es APROBADO
            maximumDeliveryDate: state === stateList.APROBADO ? maximumDeliveryDate : draft.maximumDeliveryDate
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
   * Mantiene su vigencia para la tabla interna de control de archivos cargados.
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
}
