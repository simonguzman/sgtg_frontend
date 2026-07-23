import { inject, Injectable } from '@angular/core';
import { delay, first, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { CorrectedDelivery } from '../interfaces/corrected-delivery.interface';
import { FinalDelivery } from '../interfaces/final-delivery.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';
import { formatThesisDate } from '../helpers/thesis-date.helper';
// ← UserApiService eliminado: era dead code (this.api nunca se usaba en este servicio)

@Injectable({ providedIn: 'root' })
export class ThesisWorkDeliveryService {
  private readonly storage     = inject(ThesisWorkStorageService);
  private readonly eventBus    = inject(EventBusService);
  private readonly userService = inject(UserService);

  uploadFinalDeliveryMock(
    thesisWorkId: string,
    monograph: File,
    formatE: File,
    annexes?: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = '';

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds = collectParticipantIds(proposal);

          notifyUserIds.push(
            ...this.userService.users()
              .filter(u => u.roles?.includes(UserRoleType.DECANATURA))
              .map(u => u.id)
          );

          const dateStr = formatThesisDate();

          const docMonograph: FileDocument = {
            id:         crypto.randomUUID(),
            name:       monograph.name.replace('.pdf', ''),
            url:        `uploads/final-delivery/monografia_${monograph.name}`,
            uploadDate: dateStr,
            type:       DocumentType.MONOGRAFIA,
            status:     stateList.EN_REVISION
          };

          const docFormatE: FileDocument = {
            id:         crypto.randomUUID(),
            name:       formatE.name.replace('.pdf', ''),
            url:        `uploads/final-delivery/formato_e_${formatE.name}`,
            uploadDate: dateStr,
            type:       DocumentType.FORMATO_E,
            status:     stateList.EN_REVISION
          };

          const docAnnexes: FileDocument | undefined = annexes
            ? {
                id:         crypto.randomUUID(),
                name:       annexes.name,
                url:        `uploads/final-delivery/anexos_${annexes.name}`,
                uploadDate: dateStr,
                type:       DocumentType.ANEXOS,
                status:     stateList.EN_REVISION
              }
            : undefined;

          const newDelivery: FinalDelivery = {
            id:         crypto.randomUUID(),
            uploadDate: dateStr,
            monograph:  docMonograph,
            formatE:    docFormatE,
            annexes:    docAnnexes,
            status:     stateList.EN_REVISION
          };

          return {
            ...thesisWork,
            finalDeliveries: [newDelivery, ...(thesisWork.finalDeliveries ?? [])],
            state:           stateList.EN_REVISION
          };
        });

        this.eventBus.emit({
          type:          AppEventType.THESIS_FINAL_DELIVERY_UPLOADED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload:       { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
        });
      })
      // ← shareReplay(1) eliminado: innecesario en un cold observable de una sola emisión
    );
  }

  registerPazYSalvoMock(
    thesisWorkId: string,
    payload: PazYSalvoPayload,
    file: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let notifyUserIds: string[] = [];
        let isFullyApproved = false;
        let currentThesisTitle = '';

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds = collectParticipantIds(proposal);

          notifyUserIds.push(
            ...this.userService.users()
              .filter(u => u.roles?.includes(UserRoleType.CONSEJO))
              .map(u => u.id)
          );

          isFullyApproved = payload.academicApproved && payload.financialApproved;
          const dateStr   = formatThesisDate();

          const pazYSalvoDoc: FileDocument = {
            id:         crypto.randomUUID(),
            name:       file.name.replace('.pdf', ''),
            url:        `uploads/paz-y-salvo/${file.name}`,
            uploadDate: dateStr,
            type:       DocumentType.PAZ_Y_SALVO,
            status:     isFullyApproved ? stateList.APROBADO : stateList.NO_APROBADO
          };

          let updatedDeliveries = thesisWork.finalDeliveries ?? [];
          if (!isFullyApproved && updatedDeliveries.length > 0) {
            updatedDeliveries = updatedDeliveries.map((delivery, index) =>
              index === 0
                ? {
                    ...delivery,
                    status:   stateList.NO_APROBADO,
                    monograph: { ...delivery.monograph, status: stateList.NO_APROBADO },
                    formatE:   { ...delivery.formatE,   status: stateList.NO_APROBADO }
                  }
                : delivery
            );
          }

          return {
            ...thesisWork,
            pazYSalvos: [
              {
                id:               crypto.randomUUID(),
                academicApproved:  payload.academicApproved,
                academicComments:  payload.academicComments,
                financialApproved: payload.financialApproved,
                financialComments: payload.financialComments,
                document:          pazYSalvoDoc,
                registrationDate:  new Date()
              },
              ...(thesisWork.pazYSalvos ?? [])
            ],
            documents:       [pazYSalvoDoc, ...(thesisWork.documents ?? [])],
            finalDeliveries: updatedDeliveries,
            state:           stateList.EN_REVISION
          };
        });

        this.eventBus.emit({
          type:          AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload:       { thesisId: thesisWorkId, isApproved: isFullyApproved, thesisTitle: currentThesisTitle }
        });
      })
      // ← shareReplay(1) eliminado
    );
  }

  uploadCorrectedDocumentsMock(
    thesisWorkId: string,
    monograph: File,
    annexes?: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = '';

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          currentThesisTitle = thesisWork.preliminaryDraftData?.proposalData?.title ?? '';

          const currentSustentation = thesisWork.sustentations?.[0];
          if (currentSustentation?.assignedJurors?.length) {
            notifyUserIds.push(...currentSustentation.assignedJurors.map(j => j.id));
          }

          const dateStr = formatThesisDate();

          const docMonograph: FileDocument = {
            id:         crypto.randomUUID(),
            name:       monograph.name.replace('.pdf', ''),
            url:        `uploads/corrected-documents/${monograph.name}`,
            uploadDate: dateStr,
            type:       DocumentType.CORRECCION,
            status:     stateList.EN_REVISION
          };

          const newDocuments: FileDocument[] = [docMonograph];
          let docAnnexes: FileDocument | undefined;

          if (annexes) {
            docAnnexes = {
              id:         crypto.randomUUID(),
              name:       annexes.name,
              url:        `uploads/corrected-documents/${annexes.name}`,
              uploadDate: dateStr,
              type:       DocumentType.CORRECCION,
              status:     stateList.EN_REVISION
            };
            newDocuments.push(docAnnexes);
          }

          const newCorrectedDelivery: CorrectedDelivery = {
            id:         crypto.randomUUID(),
            uploadDate: dateStr,
            monograph:  docMonograph,
            annexes:    docAnnexes,
            status:     stateList.EN_REVISION
          };

          return {
            ...thesisWork,
            documents:           [...newDocuments, ...(thesisWork.documents ?? [])],
            correctedDeliveries: [newCorrectedDelivery, ...(thesisWork.correctedDeliveries ?? [])],
            state:               stateList.EN_REVISION
          };
        });

        this.eventBus.emit({
          type:          AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload:       { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
        });
      })
    );
  }

  registerCorrespondenceDocumentMock(
    thesisWorkId: string,
    document: FileDocument
  ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = '';
        const evaluatorIdsToClean: string[] = [];
        const jurorIdsToClean: string[]     = [];

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);

          let updatedDeliveries = thesisWork.finalDeliveries ?? [];
          if (updatedDeliveries.length > 0) {
            updatedDeliveries = updatedDeliveries.map((delivery, index) =>
              index === 0
                ? {
                    ...delivery,
                    status:   stateList.APROBADO,
                    monograph: { ...delivery.monograph, status: stateList.APROBADO },
                    formatE:   { ...delivery.formatE,   status: stateList.APROBADO },
                    annexes:   delivery.annexes ? { ...delivery.annexes, status: stateList.APROBADO } : undefined
                  }
                : delivery
            );
          }

          thesisWork.preliminaryDraftData?.evaluators?.forEach((ev: User) => {
            if (ev.id) evaluatorIdsToClean.push(ev.id);
          });

          thesisWork.sustentations?.forEach(sust => {
            sust.assignedJurors?.forEach((juror: User) => {
              if (juror.id) jurorIdsToClean.push(juror.id);
            });
          });

          return {
            ...thesisWork,
            documents:       [document, ...(thesisWork.documents ?? [])],
            finalDeliveries: updatedDeliveries,
            isArchived:      true
          };
        });

        // ← UserService.removeRolesFromUsersMock usado consistentemente en vez de api.removeRolesFromUsers
        // ← first() agregado para completar la suscripción tras la primera emisión
        if (evaluatorIdsToClean.length > 0) {
          this.userService.removeRolesFromUsersMock(
            [...new Set(evaluatorIdsToClean)], [UserRoleType.EVALUADOR]
          ).pipe(first()).subscribe();
        }

        if (jurorIdsToClean.length > 0) {
          this.userService.removeRolesFromUsersMock(
            [...new Set(jurorIdsToClean)], [UserRoleType.JURADO]
          ).pipe(first()).subscribe();
        }

        this.eventBus.emit({
          type:          AppEventType.THESIS_CORRESPONDENCE_REGISTERED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload:       { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
        });
      })
    );
  }
}
