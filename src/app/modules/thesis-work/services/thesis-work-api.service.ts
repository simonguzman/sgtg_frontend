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
  private readonly storage     = inject(ThesisWorkStorageService);
  private readonly userService = inject(UserService);
  private readonly eventBus    = inject(EventBusService);

  public getThesisWorkByIdMock(id: string) {
    return this.storage.getById(id);
  }

  /**
   * Verifica plazos máximos de entrega. Se llama en el constructor del facade
   * para ejecutarse una vez al iniciar la aplicación.
   */
  public verifyDeliveryDeadlinesMock(): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        const now      = new Date();
        const allWorks = this.storage.allThesisWorks();

        allWorks.forEach(work => {
          if (work.state !== stateList.EN_DESARROLLO) return;

          const maxDateStr = work.preliminaryDraftData?.maximumDeliveryDate;
          if (!maxDateStr) return;

          const maxDate = new Date(maxDateStr);
          if (now <= maxDate) return;

          const hasFinalDelivery = work.finalDeliveries && work.finalDeliveries.length > 0;
          if (hasFinalDelivery) return;

          let notifyUserIds: string[] = [];
          const evaluatorIdsToClean: string[] = [];

          this.storage.updateWork(work.thesisWorkId, (w: ThesisWork) => {
            const proposal = w.preliminaryDraftData?.proposalData;
            notifyUserIds  = collectParticipantIds(proposal);

            w.preliminaryDraftData?.evaluators?.forEach((evaluator: User) => {
              if (evaluator.id) evaluatorIdsToClean.push(evaluator.id);
            });

            return {
              ...w,
              state:      stateList.NO_APROBADO,
              isArchived: true,
              preliminaryDraftData: {
                ...w.preliminaryDraftData,
                isArchived: true,
                proposalData: { ...w.preliminaryDraftData.proposalData, isArchived: true }
              }
            };
          });

          // ← UserService en vez de UserApiService directamente; first() para completar la suscripción
          if (evaluatorIdsToClean.length > 0) {
            this.userService.removeRolesFromUsersMock(
              [...new Set(evaluatorIdsToClean)], [UserRoleType.EVALUADOR]
            ).pipe(first()).subscribe();
          }

          this.eventBus.emit({
            type:          AppEventType.THESIS_DEADLINE_EXPIRED,
            targetUserIds: [...new Set(notifyUserIds)],
            payload: {
              thesisId:    work.thesisWorkId,
              thesisTitle: work.preliminaryDraftData?.proposalData?.title ?? 'Sin título',
              message:     'El plazo máximo de entrega final ha vencido. El trabajo de grado junto con su anteproyecto y propuesta han sido archivados como NO APROBADOS.'
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

        this.storage.updateWork(thesisWorkId, (work) => {
          const proposal = work.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);

          return { ...work, state: stateList.EN_DESARROLLO };
        });

        this.eventBus.emit({
          type:          AppEventType.THESIS_REACTIVATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload:       { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
        });
      })
    );
  }
}
