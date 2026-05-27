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

          const updatedEvaluations = [evaluation, ...(work.evaluations || [])];

          const evaluationsForThisAdvance = updatedEvaluations.filter(
            e => e.advanceId === evaluation.advanceId
          );

          const proposal = work.preliminaryDraftData?.proposalData;
          let requiredCount = 0;
          if (proposal?.director) requiredCount++;
          if (proposal?.codirector) requiredCount++;
          if (proposal?.advisor) requiredCount++;

          const uniqueEvaluators = new Set( evaluationsForThisAdvance.map(e => e.evaluatorId));
          const isFullyEvaluated =uniqueEvaluators.size >= requiredCount;
          const someoneRequestedRevisions = evaluationsForThisAdvance.some(
            e => e.veredict === stateList.EN_REVISION
          );

          const finalStatus = (isFullyEvaluated && !someoneRequestedRevisions)
            ? stateList.EVALUADO
            : stateList.EN_REVISION;

          const updatedAdvances = (work.advances || []).map(adv => {
            if (adv.id !== evaluation.advanceId) return adv;
            return {
              ...adv,
              status: finalStatus
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
