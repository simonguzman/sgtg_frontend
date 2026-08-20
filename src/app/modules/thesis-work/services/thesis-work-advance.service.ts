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
import { ThesisWork } from '../interfaces/thesis-work.interface';

@Injectable({ providedIn: 'root' })
export class ThesisWorkAdvanceService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);

  uploadDocumentMock(
    thesisWorkId: string,
    document: FileDocument,
    advanceMeta?: CreateAdvanceRequest
  ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => this.processUpload(thesisWorkId, document, advanceMeta))
    );
  }

  /**
   * Orquesta la lógica de actualización del estado local y la emisión de eventos.
   */
  private processUpload(
    thesisWorkId: string,
    document: FileDocument,
    advanceMeta?: CreateAdvanceRequest
  ): void {
    let notifyUserIds: string[] = [];
    let currentThesisTitle = '';

    this.storage.updateWork(thesisWorkId, (thesisWork) => {
      const proposal = thesisWork.preliminaryDraftData?.proposalData;
      currentThesisTitle = proposal?.title ?? '';
      notifyUserIds = collectParticipantIds(proposal);

      if (document.type !== DocumentType.AVANCE) {
        return this.processGeneralDocument(thesisWork, document);
      }

      return this.processAdvanceDocument(thesisWork, document, advanceMeta);
    });

    if (document.type === DocumentType.AVANCE) {
      this.emitAdvanceUploadedEvent(
        thesisWorkId,
        document,
        currentThesisTitle,
        notifyUserIds,
        advanceMeta
      );
    }
  }

  /**
   * Procesa la mutación del estado cuando el documento NO es un avance (Ej. FORMATOS, PAZ Y SALVOS).
   */
  private processGeneralDocument(thesisWork: ThesisWork, document: FileDocument): ThesisWork {
    const nextState = document.type === DocumentType.FORMATO
      ? stateList.EN_REVISION
      : thesisWork.state;

    return {
      ...thesisWork,
      documents: [document, ...(thesisWork.documents || [])],
      state: nextState
    };
  }

  /**
   * Procesa la mutación del estado específicamente cuando se sube un AVANCE (Nuevo o existente).
   */
  private processAdvanceDocument(
    thesisWork: ThesisWork,
    document: FileDocument,
    advanceMeta?: CreateAdvanceRequest
  ): ThesisWork {
    const targetAdvanceId = advanceMeta?.advanceId ?? document.id;
    const existingAdvances = thesisWork.advances ?? [];
    const existingAdvanceIndex = existingAdvances.findIndex(a => a.id === targetAdvanceId);

    // Evitamos mutar directamente el array original
    const updatedAdvances = [...existingAdvances];

    if (existingAdvanceIndex >= 0) {
      // Anexar documento a avance existente
      const advance = updatedAdvances[existingAdvanceIndex];
      updatedAdvances[existingAdvanceIndex] = {
        ...advance,
        documents: [...(advance.documents || []), document]
      };
    } else {
      // Crear nuevo registro de avance
      updatedAdvances.unshift({
        id: targetAdvanceId,
        title: advanceMeta?.title ?? document.name,
        comments: advanceMeta?.comments ?? '',
        uploadDate: new Date(document.uploadDate),
        studentId: advanceMeta?.studentId ?? '',
        status: stateList.EN_REVISION,
        documents: [document]
      });
    }

    return { ...thesisWork, advances: updatedAdvances };
  }

  /**
   * Centraliza la lógica de notificación en el bus de eventos.
   */
  private emitAdvanceUploadedEvent(
    thesisWorkId: string,
    document: FileDocument,
    thesisTitle: string,
    notifyUserIds: string[],
    advanceMeta?: CreateAdvanceRequest
  ): void {
    this.eventBus.emit({
      type: AppEventType.THESIS_ADVANCE_UPLOADED,
      targetUserIds: [...new Set(notifyUserIds)], // Set garantiza que no haya IDs duplicados
      payload: {
        thesisId: thesisWorkId,
        thesisWorkId,
        title: advanceMeta?.title ?? document.name,
        thesisTitle
      }
    });
  }
}
