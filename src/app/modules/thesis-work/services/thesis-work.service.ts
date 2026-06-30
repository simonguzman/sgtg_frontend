import { inject, Injectable } from '@angular/core';
import { delay, of, tap } from 'rxjs';

// --- Importación de Sub-servicios ---
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkDeliveryService } from './thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from './thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { ThesisWorkSustentationService } from './thesis-work-sustentation.service';

// --- Interfaces y Enums ---
import { Document } from '../../../core/interfaces/Document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';
import { SpecialRequestType } from '../interfaces/thesis-work.interface';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { User } from '../../users/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly advanceService = inject(ThesisWorkAdvanceService);
  private readonly deliveryService = inject(ThesisWorkDeliveryService);
  private readonly evaluationService = inject(ThesisWorkEvaluationService);
  private readonly specialRequestService = inject(ThesisWorkSpecialRequestService);
  private readonly sustentationService = inject(ThesisWorkSustentationService);
  private readonly eventBus = inject(EventBusService); // 💡 Inyectado para control local de reactivación

  readonly thesisWorks = this.storage.thesisWorks;

  readonly allThesisWorks = this.storage.allThesisWorks;

  reactivateThesisWorkMock(thesisWorkId: string) {
    return of(undefined).pipe(
      delay(500),
      tap(() => {
        let currentThesisTitle = '';
        let notifyUserIds: string[] = [];

        this.storage.updateWork(thesisWorkId, (work) => {
          const proposal = work.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title || '';

          if (proposal) {
            proposal.authors?.forEach((author: User | string) => {
              notifyUserIds.push(typeof author === 'string' ? author : author.id);
            });
            if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
            if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
            if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);
          }

          return {
            ...work,
            state: stateList.EN_DESARROLLO
          };
        });

        // 💡 Emisión del evento de reactivación que faltaba en el flujo original
        this.eventBus.emit({
          type: AppEventType.THESIS_REACTIVATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId: thesisWorkId,
            thesisTitle: currentThesisTitle
          }
        });
      })
    );
  }

  getThesisWorkByIdMock(id: string) {
    return this.storage.getById(id);
  }

  uploadDocumentMock(thesisWorkId: string, document: Document, advanceMeta?: CreateAdvanceRequest ) {
    return this.advanceService.uploadDocumentMock(thesisWorkId, document, advanceMeta);
  }

  uploadFinalDeliveryMock(thesisWorkId: string, monograph: File, formatE: File, annexes?: File) {
    return this.deliveryService.uploadFinalDeliveryMock(thesisWorkId, monograph, formatE, annexes);
  }

  uploadCorrectedDocumentsMock(thesisWorkId: string, monograph: File, annexes?: File) {
    return this.deliveryService.uploadCorrectedDocumentsMock(thesisWorkId, monograph, annexes);
  }

  registerCorrespondenceDocumentMock(thesisWorkId: string, document: Document) {
    return this.deliveryService.registerCorrespondenceDocumentMock(thesisWorkId, document);
  }

  registerPazYSalvoMock(thesisWorkId: string, payload: PazYSalvoPayload , file: File) {
    return this.deliveryService.registerPazYSalvoMock(thesisWorkId, payload, file);
  }

  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation) {
    return this.evaluationService.addEvaluationMock(thesisWorkId, evaluation);
  }

  saveSustentationRegistryMock(thesisWorkId: string, formData: any) {
    return this.sustentationService.saveSustentationRegistryMock(thesisWorkId, formData);
  }

  registerSustentationVerdictMock(thesisWorkId: string, payload: { veredict: stateList; observations: string; evaluationDate: Date }, file: File) {
    return this.sustentationService.registerSustentationVerdictMock(thesisWorkId, payload, file);
  }

  evaluateCorrectedDocumentsMock(thesisWorkId: string, evaluationData: Omit<Evaluation, 'id' | 'date'>, formatGFile: File) {
    return this.sustentationService.evaluateCorrectedDocumentsMock(thesisWorkId, evaluationData, formatGFile);
  }

  createSpecialRequestMock(payload: { requestType: SpecialRequestType; comments: string; thesisId: string }) {
    return this.specialRequestService.createSpecialRequestMock(payload);
  }

  evaluateSpecialRequestMock(
    thesisWorkId: string,
    requestId: string,
    payload: {
      status: stateList.APROBADO | stateList.NO_APROBADO;
      resolutionDetails: string;
      grantedDeadline?: Date
    }
  ) {
    return this.specialRequestService.evaluateSpecialRequestMock(thesisWorkId, requestId, payload);
  }
}
