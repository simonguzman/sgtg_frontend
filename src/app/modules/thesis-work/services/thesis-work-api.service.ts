import { inject, Injectable } from '@angular/core';
import { delay, first, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';

@Injectable({ providedIn: 'root' })
export class ThesisWorkApiService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);

  public getThesisWorkByIdMock(id: string) {
    return this.storage.getById(id);
  }

  public verifyDeliveryDeadlinesMock(): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        const now = new Date();
        const allWorks = this.storage.allThesisWorks();
        allWorks.forEach(thesisWork => {
          if (thesisWork.state !== stateList.EN_DESARROLLO) return;
          const maxDateStr = thesisWork.preliminaryDraftData?.maximumDeliveryDate;
          if (!maxDateStr) return;
          const maxDate = new Date(maxDateStr);
          if (now <= maxDate) return;
          const hasFinalDelivery = thesisWork.finalDeliveries && thesisWork.finalDeliveries.length > 0;
          if (hasFinalDelivery) return;
          let notifyUserIds: string[] = [];
          const evaluatorIdsToClean: string[] = [];
          this.storage.updateWork(thesisWork.thesisWorkId, (thesisWork: ThesisWork) => {
            const proposal = thesisWork.preliminaryDraftData?.proposalData;
            notifyUserIds  = collectParticipantIds(proposal);
            thesisWork.preliminaryDraftData?.evaluators?.forEach((evaluator: User) => {
              if (evaluator.id) evaluatorIdsToClean.push(evaluator.id);
            });
            return {
              ...thesisWork,
              state: stateList.NO_APROBADO,
              isArchived: true,
              preliminaryDraftData: {
                ...thesisWork.preliminaryDraftData,
                isArchived: true,
                proposalData: { ...thesisWork.preliminaryDraftData.proposalData, isArchived: true }
              }
            };
          });
          if (evaluatorIdsToClean.length > 0) {
            this.userService.removeRolesFromUsersMock(
              [...new Set(evaluatorIdsToClean)], [UserRoleType.EVALUADOR]
            ).pipe(first()).subscribe();
          }
          this.eventBus.emit({
            type: AppEventType.THESIS_DEADLINE_EXPIRED,
            targetUserIds: [...new Set(notifyUserIds)],
            payload: {
              thesisId: thesisWork.thesisWorkId,
              thesisTitle: thesisWork.preliminaryDraftData?.proposalData?.title ?? 'Sin título',
              message: 'El plazo máximo de entrega final ha vencido. El trabajo de grado junto con su anteproyecto y propuesta han sido archivados como NO APROBADOS.'
            }
          });
        });
      })
    );
  }

  public reactivateThesisWorkMock(thesisWorkId: string): Observable<void> {
    return of(undefined).pipe(
      delay(500),
      tap(() => {
        let currentThesisTitle = '';
        let notifyUserIds: string[] = [];
        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);
          // ← FIX: antes solo cambiaba `state`, dejando isArchived: true
          // intacto — un trabajo "reactivado" seguía archivado. Verificado
          // contra ThesisWorkStorageService.updateWork(): la cascada de
          // archivado solo se dispara al pasar de false→true, nunca al
          // revés, así que este cambio es seguro.
          return { ...thesisWork, state: stateList.EN_DESARROLLO, isArchived: false };
        });
        this.eventBus.emit({
          type: AppEventType.THESIS_REACTIVATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
        });
      })
    );
  }
}
