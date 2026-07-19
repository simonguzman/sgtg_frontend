import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

// --- Importación de Sub-servicios ---
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkDeliveryService } from './thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from './thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { ThesisWorkSustentationService } from './thesis-work-sustentation.service';
import { UserApiService } from '../../users/services/user-api.service';

// --- Interfaces y Enums ---
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

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
  private readonly eventBus = inject(EventBusService);
  private readonly api = inject(UserApiService);

  readonly thesisWorks = this.storage.thesisWorks;
  readonly allThesisWorks = this.storage.allThesisWorks;

  constructor() {
    this.verifyDeliveryDeadlinesMock().subscribe();
  }

  /**
   * Verifica los plazos máximos de entrega de manera automática.
   * Si expira el plazo sin entrega final, reprueba el trabajo y ejecuta el archivado en cascada.
   */
  private verifyDeliveryDeadlinesMock(): Observable<void> {
    return of(undefined).pipe(
      delay(1000), // Pequeño delay para asegurar que el storage simulado esté inicializado con datos
      tap(() => {
        const now = new Date();
        const allWorks = this.storage.allThesisWorks();

        allWorks.forEach(work => {
          // Solo evaluamos los que siguen en desarrollo activo
          if (work.state !== stateList.EN_DESARROLLO) return;

          const maxDateStr = work.preliminaryDraftData?.maximumDeliveryDate;
          if (!maxDateStr) return;

          const maxDate = new Date(maxDateStr);

          // Si la fecha actual superó el plazo máximo establecido
          if (now > maxDate) {
            const hasFinalDelivery = work.finalDeliveries && work.finalDeliveries.length > 0;

            if (!hasFinalDelivery) {
              let notifyUserIds: string[] = [];
              let currentThesisTitle = work.preliminaryDraftData?.proposalData?.title || 'Sin título';
              let evaluatorIdsToClean: string[] = [];

              this.storage.updateWork(work.thesisWorkId, (w) => {
                const preliminaryDraft = w.preliminaryDraftData;
                const proposal = preliminaryDraft?.proposalData;

                if (proposal) {
                  proposal.authors?.forEach((author: User | string) => {
                    notifyUserIds.push(typeof author === 'string' ? author : author.id);
                  });
                  if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
                  if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
                  if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);
                }

                if (preliminaryDraft?.evaluators) {
                  preliminaryDraft.evaluators.forEach((evaluator: User) => {
                    if (evaluator.id) evaluatorIdsToClean.push(evaluator.id);
                  });
                }

                return {
                  ...w,
                  state: stateList.NO_APROBADO,
                  isArchived: true,
                  preliminaryDraftData: {
                    ...w.preliminaryDraftData,
                    isArchived: true,
                    proposalData: {
                      ...w.preliminaryDraftData.proposalData,
                      isArchived: true
                    }
                  }
                };
              });

              if (evaluatorIdsToClean.length > 0) {
                const uniqueEvaluatorIds = [...new Set(evaluatorIdsToClean)];
                this.api.removeRolesFromUsers(uniqueEvaluatorIds, [UserRoleType.EVALUADOR]).subscribe();
              }

              this.eventBus.emit({
                type: AppEventType.THESIS_DEADLINE_EXPIRED,
                targetUserIds: [...new Set(notifyUserIds)],
                payload: {
                  thesisId: work.thesisWorkId,
                  thesisTitle: currentThesisTitle,
                  message: 'El plazo máximo de entrega final ha vencido. El trabajo de grado junto con su anteproyecto y propuesta han sido archivados como NO APROBADOS.'
                }
              });
            }
          }
        });
      })
    );
  }

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

  uploadDocumentMock(thesisWorkId: string, document: FileDocument, advanceMeta?: CreateAdvanceRequest ) {
    return this.advanceService.uploadDocumentMock(thesisWorkId, document, advanceMeta);
  }

  uploadFinalDeliveryMock(thesisWorkId: string, monograph: File, formatE: File, annexes?: File) {
    return this.deliveryService.uploadFinalDeliveryMock(thesisWorkId, monograph, formatE, annexes);
  }

  uploadCorrectedDocumentsMock(thesisWorkId: string, monograph: File, annexes?: File) {
    return this.deliveryService.uploadCorrectedDocumentsMock(thesisWorkId, monograph, annexes);
  }

  registerCorrespondenceDocumentMock(thesisWorkId: string, document: FileDocument) {
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
