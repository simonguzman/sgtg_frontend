import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { Document, DocumentType } from '../../../core/interfaces/Document.interface';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkAdvanceService {
  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Carga múltiples archivos y los asocia a un avance (nuevo o existente)
   */
  uploadDocumentMock(thesisWorkId: string, document: Document, advanceMeta?: CreateAdvanceRequest): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          if ((document.type as string) !== DocumentType.AVANCE) {
            const nextState = document.type === 'Formato' ? stateList.EN_REVISION : work.state;
            return {
              ...work,
              documents: [document, ...work.documents],
              state: nextState
            };
          }

          const targetAdvanceId = advanceMeta?.advanceId || document.id;
          const existingAdvances = work.advances || [];
          const advanceExists = existingAdvances.some(adv => adv.id === targetAdvanceId);
          let updatedAdvances;
          if (advanceExists) {
            updatedAdvances = existingAdvances.map(adv => {
              if (adv.id !== targetAdvanceId) return adv;
              return {
                ...adv,
                documents: [...adv.documents, document]
              };
            });
          } else {
            const newAdvance = {
              id: targetAdvanceId,
              title: advanceMeta?.title || document.name,
              comments: advanceMeta?.comments || '',
              uploadDate: new Date(document.uploadDate),
              studentId: advanceMeta?.studentId || '',
              status: stateList.EN_REVISION,
              documents: [document]
            };
            updatedAdvances = [newAdvance, ...existingAdvances];
          }

          return {
            ...work,
            advances: updatedAdvances
          };
        });
      })
    );
  }
}
