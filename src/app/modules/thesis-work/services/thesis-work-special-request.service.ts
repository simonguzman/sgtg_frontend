import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { SpecialRequest, SpecialRequestType, SustentationStatus, ThesisWork } from '../interfaces/thesis-work.interface';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/models/user-role';
import { User } from '../../users/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkSpecialRequestService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);

  createSpecialRequestMock(payload: { requestType: SpecialRequestType, comments: string, thesisId: string }): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let currentThesisTitle = '';
        let notifyUserIds: string[] = [];

        this.storage.updateWork(payload.thesisId, (thesisWork: ThesisWork): ThesisWork => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Captura del título real
          currentThesisTitle = proposal?.title || '';

          // 💡 Mapeo seguro de usuarios a notificar dentro del mutador
          if (proposal) {
            proposal.authors?.forEach((author: User | string) => {
              if (typeof author === 'string') {
                notifyUserIds.push(author);
              } else if (author?.id) {
                notifyUserIds.push(author.id);
              }
            });
            if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
            if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
            if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);
          }

          const newRequest: SpecialRequest = {
            id: crypto.randomUUID(),
            directorId: proposal?.director?.id || '',
            requestType: payload.requestType,
            requestDate: new Date(),
            description: payload.comments,
            status: stateList.EN_REVISION
          };

          return {
            ...thesisWork,
            specialRequests: [newRequest, ...(thesisWork.specialRequests || [])]
          };
        });

        // Agregar al Consejo de Facultad
        const consejoUsers = this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.CONSEJO))
          .map(user => user.id);
        notifyUserIds.push(...consejoUsers);

        this.eventBus.emit({
          type: AppEventType.SPECIAL_REQUEST_CREATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId: payload.thesisId, // 💡 Duplicado para consistencia de enrutamiento
            thesisWorkId: payload.thesisId,
            type: payload.requestType,
            thesisTitle: currentThesisTitle // 💡 Título inyectado con éxito
          }
        });
      })
    );
  }

  evaluateSpecialRequestMock(
    thesisWorkId: string,
    requestId: string,
    payload: { status: stateList.APROBADO | stateList.NO_APROBADO; resolutionDetails: string; grantedDeadline?: Date }
  ): Observable<void> {
    return of(undefined).pipe(
      delay(900),
      tap(() => {
        let currentThesisTitle = '';
        let notifyUserIds: string[] = [];

        this.storage.updateWork(thesisWorkId, (thesisWork: ThesisWork): ThesisWork => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Captura del título real
          currentThesisTitle = proposal?.title || '';

          if (proposal) {
            proposal.authors?.forEach((author: User | string) => {
              if (typeof author === 'string') {
                notifyUserIds.push(author);
              } else if (author?.id) {
                notifyUserIds.push(author.id);
              }
            });
            if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
            if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
            if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);
          }

          let updatedState = thesisWork.state;
          let updatedDraft = { ...thesisWork.preliminaryDraftData };
          let updatedSustentations = [...(thesisWork.sustentations || [])];
          let updatedDocuments = [...(thesisWork.documents || [])];
          let isArchived = thesisWork.isArchived;

          const updatedRequests = (thesisWork.specialRequests || []).map(req => {
            if (req.id !== requestId) return req;

            if (payload.status === stateList.APROBADO) {
              switch (req.requestType) {
                case SpecialRequestType.CANCELACION:
                  updatedState = stateList.CANCELADO;
                  isArchived = true;
                  break;

                case SpecialRequestType.SUSPENSION:
                  updatedState = stateList.SUSPENDIDO;
                  if (payload.grantedDeadline) {
                    updatedDraft.maximumDeliveryDate = payload.grantedDeadline;
                  }
                  break;

                case SpecialRequestType.PRORROGA:
                  if (payload.grantedDeadline) {
                    updatedDraft.maximumDeliveryDate = payload.grantedDeadline;
                  }
                  break;

                case SpecialRequestType.NUEVA_SUSTENTACION:
                  if (updatedSustentations.length > 0) {
                    const pendingSustentation = { ...updatedSustentations[0] };
                    pendingSustentation.status = SustentationStatus.APLAZADA;

                    if (pendingSustentation.formatEDocument) {
                      const targetDocId = pendingSustentation.formatEDocument.id;
                      pendingSustentation.formatEDocument = {
                        ...pendingSustentation.formatEDocument,
                        status: stateList.APLAZADO
                      };
                      updatedDocuments = updatedDocuments.map(doc =>
                        doc.id === targetDocId ? { ...doc, status: stateList.APLAZADO } : doc
                      );
                    }
                    updatedSustentations[0] = pendingSustentation;
                  }
                  break;

                case SpecialRequestType.CAMBIO_TITULO:
                  break;
              }
            }

            return {
              ...req,
              status: payload.status,
              resolutionDetails: payload.resolutionDetails,
              grantedDeadline: payload.grantedDeadline
            };
          });

          return {
            ...thesisWork,
            state: updatedState,
            preliminaryDraftData: updatedDraft,
            sustentations: updatedSustentations,
            documents: updatedDocuments,
            specialRequests: updatedRequests
          };
        });

        this.eventBus.emit({
          type: AppEventType.SPECIAL_REQUEST_RESOLVED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId: thesisWorkId,
            thesisWorkId: thesisWorkId,
            status: payload.status,
            thesisTitle: currentThesisTitle // 💡 Título inyectado con éxito
          }
        });
      })
    );
  }
}
