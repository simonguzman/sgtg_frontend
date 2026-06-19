import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { User } from '../../users/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkEvaluationService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);

  /**
   * Guarda la evaluación de un avance y actualiza el estado del avance afectado
   */
  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = ''; // 💡 Variable puente para el título

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const authors = thesisWork.preliminaryDraftData?.proposalData?.authors || [];
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Capturamos el título real del trabajo de grado
          currentThesisTitle = proposal?.title || '';

          if(proposal?.director?.id) notifyUserIds.push(proposal.director.id);
          if(proposal?.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if(proposal?.advisor?.id) notifyUserIds.push(proposal.advisor.id);

          notifyUserIds.push(...authors.map(author => typeof author === 'string' ? author : (author as User).id));

          const updatedEvaluations = [evaluation, ...(thesisWork.evaluations || [])];

          const evaluationsForThisAdvance = updatedEvaluations.filter(
            e => e.advanceId === evaluation.advanceId
          );

          let requiredCount = 0;
          if (proposal?.director) requiredCount++;
          if (proposal?.codirector) requiredCount++;
          if (proposal?.advisor) requiredCount++;

          const uniqueEvaluators = new Set(evaluationsForThisAdvance.map(e => e.evaluatorId));
          const isFullyEvaluated = uniqueEvaluators.size >= requiredCount;
          const someoneRequestedRevisions = evaluationsForThisAdvance.some(
            e => e.veredict === stateList.EN_REVISION
          );

          const finalStatus = (isFullyEvaluated && !someoneRequestedRevisions)
            ? stateList.EVALUADO
            : stateList.EN_REVISION;

          const updatedAdvances = (thesisWork.advances || []).map(adv => {
            if (adv.id !== evaluation.advanceId) return adv;
            return {
              ...adv,
              status: finalStatus
            };
          });

          return {
            ...thesisWork,
            advances: updatedAdvances,
            targetUserIds: [...new Set(notifyUserIds)],
            evaluations: updatedEvaluations
          };
        });

        // 💡 Emisión corregida: payload ahora incluye el título y es consistente con thesisId
        this.eventBus.emit({
          type: AppEventType.THESIS_ADVANCE_EVALUATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId: thesisWorkId, // 💡 Consistencia para redirecciones en el EventProcessor
            thesisWorkId: thesisWorkId,
            veredict: evaluation.veredict,
            thesisTitle: currentThesisTitle // 💡 Título inyectado con éxito
          }
        });
      })
    );
  }
}
