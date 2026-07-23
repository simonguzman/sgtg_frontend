import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftApiService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);

  public getPreliminaryDraftById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.storage.getById(id);
  }

  public createPreliminaryDraft(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return of(preliminaryDraft).pipe(
      delay(1000),
      tap(newDraft => {
        const preliminaryDraftToSave: PreliminaryDraft = {
          ...newDraft,
          preliminaryDraftId: crypto.randomUUID(),
          evaluations: newDraft.evaluations || [],
          documents:   newDraft.documents   || [],
          createdData: new Date(),
          state:       newDraft.state       || stateList.EN_REVISION
        };

        this.storage.addDraft(preliminaryDraftToSave);

        const notifyUserIds: string[] = [];
        const proposal = preliminaryDraftToSave.proposalData;

        if (proposal) {
          proposal.authors?.forEach(author => {
            const id = typeof author === 'string' ? author : author?.id;
            if (id) notifyUserIds.push(id);
          });
          if (proposal.director?.id)   notifyUserIds.push(proposal.director.id);
          if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if (proposal.advisor?.id)    notifyUserIds.push(proposal.advisor.id);
        }

        const jefesDepto = this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.JEFE_DEP))
          .map(user => user.id);
        notifyUserIds.push(...jefesDepto);

        this.eventBus.emit({
          type: AppEventType.PRELIMINARY_DRAFT_CREATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            preliminaryDraftId: preliminaryDraftToSave.preliminaryDraftId,
            preliminaryDraftTitle: proposal?.title || ''
          }
        });
      })
    );
  }

  public updatePreliminaryDraft(
    id: string,
    updatedData: PreliminaryDraft
  ): Observable<PreliminaryDraft> {
    return of(updatedData).pipe(
      delay(800),
      tap(() => {
        this.storage.updateDraft(id, PreliminaryDraft => ({ ...PreliminaryDraft, ...updatedData }));
      })
    );
  }

  public deleteDraft(id: string): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => this.storage.removeDraft(id))
    );
  }
}
