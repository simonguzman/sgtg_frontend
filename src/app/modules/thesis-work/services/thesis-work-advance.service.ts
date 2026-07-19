import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkAdvanceService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);

  /**
   * Carga múltiples archivos y los asocia a un avance (nuevo o existente)
   */
  uploadDocumentMock(thesisWorkId: string, document: FileDocument, advanceMeta?: CreateAdvanceRequest): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = ''; // 💡 Variable puente para capturar el título del trabajo de grado

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Capturamos de forma segura el título desde el modelo relacional anidado
          currentThesisTitle = proposal?.title || '';

          if(proposal?.director?.id) notifyUserIds.push(proposal.director.id);
          if(proposal?.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if(proposal?.advisor?.id) notifyUserIds.push(proposal.advisor.id);

          if ((document.type as string) !== DocumentType.AVANCE) {
            const nextState = document.type === 'Formato' ? stateList.EN_REVISION : thesisWork.state;
            return {
              ...thesisWork,
              documents: [document, ...thesisWork.documents],
              state: nextState
            };
          }

          const targetAdvanceId = advanceMeta?.advanceId || document.id;
          const existingAdvances = thesisWork.advances || [];
          const advanceExists = existingAdvances.some(advance => advance.id === targetAdvanceId);
          let updatedAdvances;

          if (advanceExists) {
            updatedAdvances = existingAdvances.map(advance => {
              if (advance.id !== targetAdvanceId) return advance;
              return {
                ...advance,
                documents: [...advance.documents, document]
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
            ...thesisWork,
            advances: updatedAdvances
          };
        });

        if((document.type as string) === DocumentType.AVANCE){
          this.eventBus.emit({
            type: AppEventType.THESIS_ADVANCE_UPLOADED,
            targetUserIds: [...new Set(notifyUserIds)],
            payload: {
              thesisId: thesisWorkId, // 💡 Agregamos thesisId para que coincida exactamente con la actionUrl del EventProcessor
              thesisWorkId: thesisWorkId,
              title: advanceMeta?.title || document.name,
              thesisTitle: currentThesisTitle // 💡 Inyectamos el título mapeado
            }
          });
        }
      })
    );
  }
}
