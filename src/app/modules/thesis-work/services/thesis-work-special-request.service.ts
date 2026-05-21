import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { SpecialRequest } from '../interfaces/thesis-work.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkSpecialRequestService {
  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Crea una solicitud extraordinaria para el comité
   */
  createSpecialRequestMock(payload: { requestType: string, comments: string, thesisId: string }): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateWork(payload.thesisId, (work) => {
          const newRequest: SpecialRequest = {
            id: crypto.randomUUID(),
            directorId: work.preliminaryDraftData?.proposalData?.director?.id || '',
            requestDate: new Date(),
            description: `[${payload.requestType}] - ${payload.comments}`,
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

  /**
   * Resuelve el estado de una solicitud (Aprobado / No Aprobado) por parte de las autoridades
   */
  evaluateSpecialRequestMock(
    thesisWorkId: string,
    requestId: string,
    payload: { status: stateList.APROBADO | stateList.NO_APROBADO; resolutionDetails: string }
  ): Observable<void> {
    return of(undefined).pipe(
      delay(900),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          const updatedRequests = (work.specialRequests || []).map(req => {
            if (req.id !== requestId) return req;
            return {
              ...req,
              status: payload.status,
              resolutionDetails: payload.resolutionDetails
            };
          });
          return {
            ...work,
            specialRequests: updatedRequests
          };
        });
      })
    );
  }
}
