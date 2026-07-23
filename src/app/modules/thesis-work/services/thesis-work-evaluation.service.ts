import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';

@Injectable({ providedIn: 'root' })
export class ThesisWorkEvaluationService {
  private readonly storage  = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);

  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = '';

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);

          const updatedEvaluations = [evaluation, ...(thesisWork.evaluations ?? [])];

          const evaluationsForThisAdvance = updatedEvaluations.filter(
            e => e.advanceId === evaluation.advanceId
          );

          let requiredCount = 0;
          if (proposal?.director)   requiredCount++;
          if (proposal?.codirector) requiredCount++;
          if (proposal?.advisor)    requiredCount++;

          const uniqueEvaluators = new Set(evaluationsForThisAdvance.map(e => e.evaluatorId));
          const isFullyEvaluated = uniqueEvaluators.size >= requiredCount;

          // ← Lambda renombrada de 'evaluation' a 'e' para evitar shadowing del parámetro externo
          const someoneRequestedRevisions = evaluationsForThisAdvance.some(
            e => e.veredict === stateList.EN_REVISION
          );

          const finalStatus = isFullyEvaluated && !someoneRequestedRevisions
            ? stateList.EVALUADO
            : stateList.EN_REVISION;

          const updatedAdvances = (thesisWork.advances ?? []).map(advance =>
            advance.id !== evaluation.advanceId
              ? advance
              : { ...advance, status: finalStatus }
          );

          return {
            ...thesisWork,
            advances:    updatedAdvances,
            evaluations: updatedEvaluations
          };
        });

        this.eventBus.emit({
          type:          AppEventType.THESIS_ADVANCE_EVALUATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId:    thesisWorkId,
            thesisWorkId,
            veredict:    evaluation.veredict,
            thesisTitle: currentThesisTitle
          }
        });
      })
    );
  }
}
