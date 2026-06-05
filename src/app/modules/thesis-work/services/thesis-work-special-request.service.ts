import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { SpecialRequest, SpecialRequestType, SustentationStatus } from '../interfaces/thesis-work.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkSpecialRequestService {
  private readonly storage = inject(ThesisWorkStorageService);

  createSpecialRequestMock(payload: { requestType: SpecialRequestType, comments: string, thesisId: string }): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateWork(payload.thesisId, (work) => {
          const newRequest: SpecialRequest = {
            id: crypto.randomUUID(),
            directorId: work.preliminaryDraftData?.proposalData?.director?.id || '',
            requestType: payload.requestType,
            requestDate: new Date(),
            description: payload.comments,
            status: stateList.EN_REVISION
          };
          return {
            ...work,
            specialRequests: [newRequest, ...(work.specialRequests || [])]
          };
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
        this.storage.updateWork(thesisWorkId, (work) => {

          let updatedState = work.state;
          let updatedDraft = { ...work.preliminaryDraftData };
          let updatedSustentations = [...(work.sustentations || [])];

          const updatedRequests = (work.specialRequests || []).map(req => {
            if (req.id !== requestId) return req;

            if (payload.status === stateList.APROBADO) {
              switch (req.requestType) {

                case SpecialRequestType.CANCELACION:
                  updatedState = stateList.CANCELADO as stateList;
                  break;

                case SpecialRequestType.SUSPENSION:
                  updatedState = stateList.SUSPENDIDO as stateList;
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
                  updatedSustentations = updatedSustentations.map(s => ({
                    ...s,
                    status: SustentationStatus.CANCELADA
                  }));
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
            ...work,
            state: updatedState,
            preliminaryDraftData: updatedDraft,
            sustentations: updatedSustentations,
            specialRequests: updatedRequests
          };
        });
      })
    );
  }
}
