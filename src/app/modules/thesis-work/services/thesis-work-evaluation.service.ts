import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkEvaluationService {
  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Guarda la evaluación de un avance y actualiza el estado del avance afectado
   */
  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {

          // 1. Unificamos la nueva evaluación con las existentes
          const updatedEvaluations = [evaluation, ...(work.evaluations || [])];

          // 2. Filtramos cuántas evaluaciones tiene ESTE avance en específico
          const evaluationsForThisAdvance = updatedEvaluations.filter(
            e => e.advanceId === evaluation.advanceId
          );

          // 3. Calculamos la cuota requerida de evaluadores (Regla de negocio)
          const proposal = work.preliminaryDraftData?.proposalData;
          let requiredCount = 0;
          if (proposal?.director) requiredCount++;
          if (proposal?.codirector) requiredCount++;
          if (proposal?.advisor) requiredCount++;

          // 4. Verificamos si ya todos emitieron su evaluación
          const uniqueEvaluators = new Set( evaluationsForThisAdvance.map(e => e.evaluatorId));
          const isFullyEvaluated =uniqueEvaluators.size >= requiredCount;
          // 5. (Opcional pero recomendado) Si ALGÚN evaluador pide correcciones,
          // el avance general debería quedarse "En revisión" aunque todos hayan evaluado.
          const someoneRequestedRevisions = evaluationsForThisAdvance.some(
            e => e.veredict === stateList.EN_REVISION
          );

          const finalStatus = (isFullyEvaluated && !someoneRequestedRevisions)
            ? stateList.EVALUADO
            : stateList.EN_REVISION;

          // 6. Actualizamos el estado del avance
          const updatedAdvances = (work.advances || []).map(adv => {
            if (adv.id !== evaluation.advanceId) return adv;
            return {
              ...adv,
              status: finalStatus // 🚀 Ahora respeta la regla de los 3 evaluadores
            };
          });

          return {
            ...work,
            advances: updatedAdvances,
            evaluations: updatedEvaluations
          };
        });
      })
    );
  }
}
