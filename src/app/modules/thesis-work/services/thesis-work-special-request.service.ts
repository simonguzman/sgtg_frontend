import { inject, Injectable } from '@angular/core';
import { delay, first, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SpecialRequest } from '../interfaces/special-request.interface';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { SustentationStatus } from '../enums/sustentation-status.enum';
import { stateList } from '../../../core/enums/state.enum';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { AuthService } from '../../../core/services/auth/auth.service';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';
// ← UserApiService eliminado: era dead code (this.userService cubría todos los casos)

@Injectable({ providedIn: 'root' })
export class ThesisWorkSpecialRequestService {
  private readonly storage     = inject(ThesisWorkStorageService);
  private readonly eventBus    = inject(EventBusService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  createSpecialRequestMock(
    payload: { requestType: SpecialRequestType; comments: string; thesisId: string }
  ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let currentThesisTitle = '';
        let notifyUserIds: string[] = [];

        this.storage.updateWork(payload.thesisId, (thesisWork: ThesisWork): ThesisWork => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);

          const newRequest: SpecialRequest = {
            id:          crypto.randomUUID(),
            directorId:  proposal?.director?.id ?? '',
            requestType: payload.requestType,
            requestDate: new Date(),
            description: payload.comments,
            status:      stateList.EN_REVISION
          };

          return {
            ...thesisWork,
            specialRequests: [newRequest, ...(thesisWork.specialRequests ?? [])]
          };
        });

        notifyUserIds.push(
          ...this.userService.users()
            .filter(u => u.roles.includes(UserRoleType.CONSEJO))
            .map(u => u.id)
        );

        this.eventBus.emit({
          type:          AppEventType.SPECIAL_REQUEST_CREATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId:     payload.thesisId,
            thesisWorkId: payload.thesisId,
            type:         payload.requestType,
            thesisTitle:  currentThesisTitle
          }
        });
      })
    );
  }

  evaluateSpecialRequestMock(
    thesisWorkId: string,
    requestId: string,
    payload: {
      status: stateList.APROBADO | stateList.NO_APROBADO;
      resolutionDetails: string;
      grantedDeadline?: Date;
    }
  ): Observable<void> {
    return of(undefined).pipe(
      delay(900),
      tap(() => {
        let currentThesisTitle = '';
        let notifyUserIds: string[] = [];
        const evaluatorIdsToClean: string[]    = [];
        const currentEvaluatorId = this.authService.currentUser()?.id ?? 'sistema';

        this.storage.updateWork(thesisWorkId, (thesisWork: ThesisWork): ThesisWork => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);

          let updatedState        = thesisWork.state;
          let updatedDraft        = { ...thesisWork.preliminaryDraftData };
          let updatedSustentations = [...(thesisWork.sustentations ?? [])];
          let updatedDocuments    = [...(thesisWork.documents ?? [])];
          let isArchived          = thesisWork.isArchived;

          const updatedRequests = (thesisWork.specialRequests ?? []).map(req => {
            if (req.id !== requestId) return req;

            if (payload.status === stateList.APROBADO) {
              switch (req.requestType) {
                case SpecialRequestType.CANCELACION:
                  updatedState = stateList.CANCELADO;
                  isArchived   = true;
                  updatedDraft.evaluators?.forEach((evaluator: User) => {
                    if (evaluator.id) evaluatorIdsToClean.push(evaluator.id);
                  });
                  break;
                case SpecialRequestType.SUSPENSION:
                  updatedState = stateList.SUSPENDIDO;
                  if (payload.grantedDeadline) updatedDraft.maximumDeliveryDate = payload.grantedDeadline;
                  break;
                case SpecialRequestType.PRORROGA:
                  if (payload.grantedDeadline) updatedDraft.maximumDeliveryDate = payload.grantedDeadline;
                  break;
                case SpecialRequestType.NUEVA_SUSTENTACION:
                  if (updatedSustentations.length > 0) {
                    const pending = { ...updatedSustentations[0] };
                    pending.status = SustentationStatus.APLAZADA;
                    if (pending.formatEDocument) {
                      const targetDocId = pending.formatEDocument.id;
                      pending.formatEDocument = { ...pending.formatEDocument, status: stateList.APLAZADO };
                      updatedDocuments = updatedDocuments.map(doc =>
                        doc.id === targetDocId ? { ...doc, status: stateList.APLAZADO } : doc
                      );
                    }
                    updatedSustentations[0] = pending;
                  }
                  break;
                case SpecialRequestType.CAMBIO_TITULO:
                  break;
              }
            }

            return {
              ...req,
              status:            payload.status,
              resolutionDetails: payload.resolutionDetails,
              grantedDeadline:   payload.grantedDeadline,
              evaluatorId:       currentEvaluatorId
            };
          });

          return {
            ...thesisWork,
            state:               updatedState,
            preliminaryDraftData: updatedDraft,
            sustentations:       updatedSustentations,
            documents:           updatedDocuments,
            specialRequests:     updatedRequests,
            isArchived
          };
        });

        if (evaluatorIdsToClean.length > 0) {
          // ← first() agregado + UserService en vez de UserApiService directamente
          this.userService.removeRolesFromUsersMock(
            [...new Set(evaluatorIdsToClean)], [UserRoleType.EVALUADOR]
          ).pipe(first()).subscribe();
        }

        this.eventBus.emit({
          type:          AppEventType.SPECIAL_REQUEST_RESOLVED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId:    thesisWorkId,
            thesisWorkId,
            status:      payload.status,
            thesisTitle: currentThesisTitle
          }
        });
      })
    );
  }
}
