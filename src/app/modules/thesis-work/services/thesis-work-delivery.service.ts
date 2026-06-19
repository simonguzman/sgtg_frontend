import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { stateList } from '../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../core/interfaces/Document.interface';
import { CorrectedDelivery, FinalDelivery } from '../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { User } from '../../users/interfaces/user.interface';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkDeliveryService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);

  /**
   * Entrega final del trabajo de grado
   */
  uploadFinalDeliveryMock(thesisWorkId: string, monograph: File, formatE: File, annexes?: File ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = ''; // 💡 Variable puente para el título

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const authors = thesisWork.preliminaryDraftData?.proposalData?.authors || [];
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Capturamos el título del trabajo
          currentThesisTitle = proposal?.title || '';

          if(proposal?.director?.id) notifyUserIds.push(proposal.director.id);
          if(proposal?.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if(proposal?.advisor?.id) notifyUserIds.push(proposal.advisor.id);
          notifyUserIds.push(...authors.map(author => typeof author === 'string' ? author : (author as User).id));

          const decanaturaUsers = this.userService.users().filter(user =>
            user.roles?.includes(UserRoleType.DECANATURA)
          );
          notifyUserIds.push(...decanaturaUsers.map(user => user.id));

          const dateStr = new Date()
            .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replaceAll('/', ' - ');

          const docMonograph: Document = {
            id: crypto.randomUUID(),
            name: monograph.name.replace('.pdf', ''),
            url: 'uploads/final-delivery/monografia_' + monograph.name,
            uploadDate: dateStr,
            type: DocumentType.MONOGRAFIA,
            status: stateList.EN_REVISION
          };

          const docFormatE: Document = {
            id: crypto.randomUUID(),
            name: formatE.name.replace('.pdf', ''),
            url: 'uploads/final-delivery/formato_e_' + formatE.name,
            uploadDate: dateStr,
            type: DocumentType.FORMATO_E,
            status: stateList.EN_REVISION
          };

          let docAnnexes: Document | undefined;
          if (annexes) {
            docAnnexes = {
              id: crypto.randomUUID(),
              name: annexes.name,
              url: 'uploads/final-delivery/anexos_' + annexes.name,
              uploadDate: dateStr,
              type: DocumentType.ANEXOS,
              status: stateList.EN_REVISION
            };
          }

          const newDelivery: FinalDelivery = {
            id: crypto.randomUUID(),
            uploadDate: dateStr,
            monograph: docMonograph,
            formatE: docFormatE,
            annexes: docAnnexes,
            status: stateList.EN_REVISION
          };

          return {
            ...thesisWork,
            finalDeliveries: [
              newDelivery,
              ...(thesisWork.finalDeliveries || [])
            ],
            state: stateList.EN_REVISION
          };
        });

        this.eventBus.emit({
          type: AppEventType.THESIS_FINAL_DELIVERY_UPLOADED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId: thesisWorkId,
            thesisTitle: currentThesisTitle // 💡 Inyección del título
          }
        });
      })
    );
  }

  /**
   * Registro de Paz y Salvo académico/financiero
   */
  registerPazYSalvoMock( thesisWorkId: string, payload: PazYSalvoPayload, file: File ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let notifyUserIds: string[] = [];
        let isFullyApproved = false;
        let currentThesisTitle = ''; // 💡 Variable puente para el título

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const authors = thesisWork.preliminaryDraftData?.proposalData?.authors || [];
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Capturamos el título del trabajo
          currentThesisTitle = proposal?.title || '';

          if(proposal?.director?.id) notifyUserIds.push(proposal.director.id);
          if(proposal?.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if(proposal?.advisor?.id) notifyUserIds.push(proposal.advisor.id);

          notifyUserIds.push(...authors.map(author => typeof author === 'string' ? author : (author as User).id));

          const consejoUsers = this.userService.users().filter(user =>
            user.roles?.includes(UserRoleType.CONSEJO)
          );
          notifyUserIds.push(...consejoUsers.map(user => user.id));

          isFullyApproved = payload.academicApproved && payload.financialApproved;
          const dateStr = new Date()
            .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replaceAll('/', ' - ');

          const pazYSalvoDoc: Document = {
            id: crypto.randomUUID(),
            name: file.name.replace('.pdf', ''),
            url: 'uploads/paz-y-salvo/' + file.name,
            uploadDate: dateStr,
            type: DocumentType.PAZ_Y_SALVO,
            status: isFullyApproved ? stateList.APROBADO : stateList.NO_APROBADO
          };

          let updatedDocuments = [
            pazYSalvoDoc,
            ...(thesisWork.documents || [])
          ];

          let updatedDeliveries = thesisWork.finalDeliveries || [];
          if (!isFullyApproved && updatedDeliveries.length > 0) {
            updatedDeliveries = updatedDeliveries.map((delivery, index) => {
              if (index === 0) {
                return {
                  ...delivery,
                  status: stateList.NO_APROBADO,
                  monograph: { ...delivery.monograph, status: stateList.NO_APROBADO },
                  formatE: { ...delivery.formatE, status: stateList.NO_APROBADO }
                };
              }
              return delivery;
            });
          }

          return {
            ...thesisWork,
            pazYSalvos: [
              {
                id: crypto.randomUUID(),
                academicApproved: payload.academicApproved,
                academicComments: payload.academicComments,
                financialApproved: payload.financialApproved,
                financialComments: payload.financialComments,
                document: pazYSalvoDoc,
                registrationDate: new Date()
              },
              ...(thesisWork.pazYSalvos || [])
            ],
            documents: updatedDocuments,
            finalDeliveries: updatedDeliveries,
            state: isFullyApproved ? thesisWork.state : stateList.NO_APROBADO
          };
        });

        this.eventBus.emit({
          type: AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId: thesisWorkId,
            isApproved: isFullyApproved,
            thesisTitle: currentThesisTitle // 💡 Inyección del título
          }
        });
      })
    );
  }

  /**
   * Subida de documentos corregidos post-sustentación (Notifica a Jurados)
   */
  uploadCorrectedDocumentsMock( thesisWorkId: string, monograph: File, annexes?: File ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = ''; // 💡 Variable puente para el título

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Capturamos el título del trabajo
          currentThesisTitle = proposal?.title || '';

          // 1. Extracción tipada y segura de los jurados de la sustentación
          if (thesisWork.sustentations && thesisWork.sustentations.length > 0) {
            const currentSustentation = thesisWork.sustentations[0];

            // Mapeamos directamente el arreglo de objetos User para extraer sus IDs
            if (currentSustentation.assignedJurors && currentSustentation.assignedJurors.length > 0) {
              const jurorIds = currentSustentation.assignedJurors.map(juror => juror.id);
              notifyUserIds.push(...jurorIds);
            }
          }

          const dateStr = new Date()
            .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replaceAll('/', ' - ');

          const docMonograph: Document = {
            id: crypto.randomUUID(),
            name: monograph.name.replace('.pdf', ''),
            url: 'uploads/corrected-documents/' + monograph.name,
            uploadDate: dateStr,
            type: DocumentType.CORRECCION,
            status: stateList.EN_REVISION
          };

          let docAnnexes: Document | undefined;
          const newDocuments: Document[] = [docMonograph];

          if (annexes) {
            docAnnexes = {
              id: crypto.randomUUID(),
              name: annexes.name,
              url: 'uploads/corrected-documents/' + annexes.name,
              uploadDate: dateStr,
              type: DocumentType.CORRECCION,
              status: stateList.EN_REVISION
            };
            newDocuments.push(docAnnexes);
          }

          const newCorrectedDelivery: CorrectedDelivery = {
            id: crypto.randomUUID(),
            uploadDate: dateStr,
            monograph: docMonograph,
            annexes: docAnnexes,
            status: stateList.EN_REVISION
          };

          return {
            ...thesisWork,
            documents: [
              ...newDocuments,
              ...(thesisWork.documents || [])
            ],
            correctedDeliveries: [
              newCorrectedDelivery,
              ...(thesisWork.correctedDeliveries || [])
            ],
            state: stateList.EN_REVISION
          };
        });

        this.eventBus.emit({
          type: AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED,
          targetUserIds: [...new Set(notifyUserIds)], // Limpia posibles duplicados
          payload: {
            thesisId: thesisWorkId,
            thesisTitle: currentThesisTitle // 💡 Inyección del título
          }
        });
      })
    );
  }

  /**
   * Registro de documento de correspondencia final
   */
  registerCorrespondenceDocumentMock( thesisWorkId: string, document: Document ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = ''; // 💡 Variable puente para el título

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const authors = thesisWork.preliminaryDraftData?.proposalData?.authors || [];
          const proposal = thesisWork.preliminaryDraftData?.proposalData;

          // 💡 Capturamos el título del trabajo
          currentThesisTitle = proposal?.title || '';

          if(proposal?.director?.id) notifyUserIds.push(proposal.director.id);
          if(proposal?.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if(proposal?.advisor?.id) notifyUserIds.push(proposal.advisor.id);
          notifyUserIds.push(...authors.map(author => typeof author === 'string' ? author : (author as User).id));

          let updatedDeliveries = thesisWork.finalDeliveries || [];
          if (updatedDeliveries.length > 0) {
            updatedDeliveries = updatedDeliveries.map((delivery, index) => {
              if (index === 0) {
                return {
                  ...delivery,
                  status: stateList.APROBADO,
                  monograph: { ...delivery.monograph, status: stateList.APROBADO },
                  formatE: { ...delivery.formatE, status: stateList.APROBADO },
                  annexes: delivery.annexes ? { ...delivery.annexes, status: stateList.APROBADO } : undefined
                };
              }
              return delivery;
            });
          }

          return {
            ...thesisWork,
            documents: [
              document,
              ...(thesisWork.documents || [])
            ],
            finalDeliveries: updatedDeliveries,
            state: stateList.APROBADO
          };
        });

        this.eventBus.emit({
          type: AppEventType.THESIS_CORRESPONDENCE_REGISTERED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            thesisId: thesisWorkId,
            thesisTitle: currentThesisTitle // 💡 Inyección del título
          }
        });
      })
    );
  }
}
