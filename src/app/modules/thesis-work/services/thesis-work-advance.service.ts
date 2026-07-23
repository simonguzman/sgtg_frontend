import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';

@Injectable({ providedIn: 'root' })
export class ThesisWorkAdvanceService {
  private readonly storage  = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);

  uploadDocumentMock(
    thesisWorkId: string,
    document: FileDocument,
    advanceMeta?: CreateAdvanceRequest
  ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = '';

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);

          // ← Cast innecesario `(document.type as string)` eliminado
          if (document.type !== DocumentType.AVANCE) {
            // ← String literal 'Formato' reemplazado por DocumentType.FORMATO
            const nextState = document.type === DocumentType.FORMATO
              ? stateList.EN_REVISION
              : thesisWork.state;
            return {
              ...thesisWork,
              documents: [document, ...thesisWork.documents],
              state:     nextState
            };
          }

          const targetAdvanceId = advanceMeta?.advanceId ?? document.id;
          const existingAdvances = thesisWork.advances ?? [];
          const advanceExists    = existingAdvances.some(a => a.id === targetAdvanceId);

          const updatedAdvances = advanceExists
            ? existingAdvances.map(advance =>
                advance.id !== targetAdvanceId
                  ? advance
                  : { ...advance, documents: [...advance.documents, document] }
              )
            : [
                {
                  id:         targetAdvanceId,
                  title:      advanceMeta?.title    ?? document.name,
                  comments:   advanceMeta?.comments ?? '',
                  uploadDate: new Date(document.uploadDate),
                  studentId:  advanceMeta?.studentId ?? '',
                  status:     stateList.EN_REVISION,
                  documents:  [document]
                },
                ...existingAdvances
              ];

          return { ...thesisWork, advances: updatedAdvances };
        });

        if (document.type === DocumentType.AVANCE) {
          this.eventBus.emit({
            type: AppEventType.THESIS_ADVANCE_UPLOADED,
            targetUserIds: [...new Set(notifyUserIds)],
            payload: {
              thesisId:    thesisWorkId,
              thesisWorkId,
              title:       advanceMeta?.title ?? document.name,
              thesisTitle: currentThesisTitle
            }
          });
        }
      })
    );
  }
}
