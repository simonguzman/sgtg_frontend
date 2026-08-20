import { inject, Injectable } from '@angular/core';
import { delay, first, from, Observable, of, switchMap, tap } from 'rxjs';
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
import { readFileAsDataUrl } from '../../../core/utils/file-reader.utils';

@Injectable({ providedIn: 'root' })
export class ThesisWorkDeliveryService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);

  /**
   * ← FIX CENTRAL: antes construía docMonograph/docFormatE/docAnnexes con
   * `url: 'uploads/final-delivery/...'` — una ruta con forma de URL real
   * pero que nunca apuntaba a ningún archivo. Ahora se leen los 3 File
   * reales vía readFileAsDataUrl ANTES de construir los documentos.
   *
   * Se usa from(...) + switchMap en vez de meter un await dentro de tap()
   * (que no puede ser async) — mismo patrón ya aplicado al corregir el
   * anti-patrón de suscripciones anidadas en
   * ThesisWorkSustentationService.registerSustentationVerdictMock.
   */
  uploadFinalDeliveryMock(
    thesisWorkId: string,
    monograph: File,
    formatE: File,
    annexes?: File
  ): Observable<void> {
    return from(this.buildFinalDeliveryDocuments(monograph, formatE, annexes)).pipe(
      switchMap(({ docMonograph, docFormatE, docAnnexes }) =>
        of(undefined).pipe(
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
                  .filter(user => user.roles?.includes(UserRoleType.DECANATURA))
                  .map(user => user.id)
              );
              const newDelivery: FinalDelivery = {
                id: crypto.randomUUID(),
                uploadDate: docMonograph.uploadDate,
                monograph: docMonograph,
                formatE: docFormatE,
                annexes: docAnnexes,
                status: stateList.EN_REVISION
              };
              return {
                ...thesisWork,
                finalDeliveries: [newDelivery, ...(thesisWork.finalDeliveries ?? [])],
                state: stateList.EN_REVISION
              };
            });
            this.eventBus.emit({
              type: AppEventType.THESIS_FINAL_DELIVERY_UPLOADED,
              targetUserIds: [...new Set(notifyUserIds)],
              payload: { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
            });
          })
        )
      )
    );
  }

  private async buildFinalDeliveryDocuments(
    monograph: File,
    formatE: File,
    annexes?: File
  ): Promise<{ docMonograph: FileDocument; docFormatE: FileDocument; docAnnexes?: FileDocument }> {
    const dateStr = formatThesisDate();
    const [monographUrl, formatEUrl, annexesUrl] = await Promise.all([
      readFileAsDataUrl(monograph),
      readFileAsDataUrl(formatE),
      annexes ? readFileAsDataUrl(annexes) : Promise.resolve(undefined)
    ]);

    const docMonograph: FileDocument = {
      id: crypto.randomUUID(),
      name: monograph.name.replace('.pdf', ''),
      url: monographUrl,
      uploadDate: dateStr,
      type: DocumentType.MONOGRAFIA,
      status: stateList.EN_REVISION
    };
    const docFormatE: FileDocument = {
      id: crypto.randomUUID(),
      name: formatE.name.replace('.pdf', ''),
      url: formatEUrl,
      uploadDate: dateStr,
      type: DocumentType.FORMATO_E,
      status: stateList.EN_REVISION
    };
    const docAnnexes: FileDocument | undefined = annexes && annexesUrl
      ? {
          id: crypto.randomUUID(),
          name: annexes.name,
          url: annexesUrl,
          uploadDate: dateStr,
          type: DocumentType.ANEXOS,
          status: stateList.EN_REVISION
        }
      : undefined;

    return { docMonograph, docFormatE, docAnnexes };
  }

  /**
   * ← FIX CENTRAL: mismo patrón — antes `url: 'uploads/paz-y-salvo/...'`.
   */
  registerPazYSalvoMock(
    thesisWorkId: string,
    payload: PazYSalvoPayload,
    file: File
  ): Observable<void> {
    return from(readFileAsDataUrl(file)).pipe(
      switchMap((fileUrl) =>
        of(undefined).pipe(
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
                  .filter(user => user.roles?.includes(UserRoleType.CONSEJO))
                  .map(user => user.id)
              );
              isFullyApproved = payload.academicApproved && payload.financialApproved;
              const pazYSalvoDoc: FileDocument = {
                id: crypto.randomUUID(),
                name: file.name.replace('.pdf', ''),
                url: fileUrl,
                uploadDate: formatThesisDate(),
                type: DocumentType.PAZ_Y_SALVO,
                status: isFullyApproved ? stateList.APROBADO : stateList.NO_APROBADO
              };
              let updatedDeliveries = thesisWork.finalDeliveries ?? [];
              if (!isFullyApproved && updatedDeliveries.length > 0) {
                updatedDeliveries = updatedDeliveries.map((delivery, index) =>
                  index === 0
                    ? {
                        ...delivery,
                        status: stateList.NO_APROBADO,
                        monograph: { ...delivery.monograph, status: stateList.NO_APROBADO },
                        formatE: { ...delivery.formatE, status: stateList.NO_APROBADO }
                      }
                    : delivery
                );
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
                  ...(thesisWork.pazYSalvos ?? [])
                ],
                documents: [pazYSalvoDoc, ...(thesisWork.documents ?? [])],
                finalDeliveries: updatedDeliveries,
                state: stateList.EN_REVISION
              };
            });
            this.eventBus.emit({
              type: AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED,
              targetUserIds: [...new Set(notifyUserIds)],
              payload: { thesisId: thesisWorkId, isApproved: isFullyApproved, thesisTitle: currentThesisTitle }
            });
          })
        )
      )
    );
  }

  /**
   * ← FIX (bonus, mismo archivo/bug): no estaba en el pedido explícito de
   * este turno, pero tenía exactamente el mismo problema que los dos
   * métodos de arriba, en el mismo servicio — dejarlo sin corregir habría
   * significado un archivo con 2 métodos arreglados y 1 con el bug
   * idéntico intacto.
   */
  uploadCorrectedDocumentsMock(
    thesisWorkId: string,
    monograph: File,
    annexes?: File
  ): Observable<void> {
    return from(this.buildCorrectedDocuments(monograph, annexes)).pipe(
      switchMap(({ docMonograph, docAnnexes }) =>
        of(undefined).pipe(
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
              const newDocuments: FileDocument[] = [docMonograph];
              if (docAnnexes) newDocuments.push(docAnnexes);
              const newCorrectedDelivery: CorrectedDelivery = {
                id: crypto.randomUUID(),
                uploadDate: docMonograph.uploadDate,
                monograph: docMonograph,
                annexes: docAnnexes,
                status: stateList.EN_REVISION
              };
              return {
                ...thesisWork,
                documents: [...newDocuments, ...(thesisWork.documents ?? [])],
                correctedDeliveries: [newCorrectedDelivery, ...(thesisWork.correctedDeliveries ?? [])],
                state: stateList.EN_REVISION
              };
            });
            this.eventBus.emit({
              type: AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED,
              targetUserIds: [...new Set(notifyUserIds)],
              payload: { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
            });
          })
        )
      )
    );
  }

  private async buildCorrectedDocuments(
    monograph: File,
    annexes?: File
  ): Promise<{ docMonograph: FileDocument; docAnnexes?: FileDocument }> {
    const dateStr = formatThesisDate();
    const [monographUrl, annexesUrl] = await Promise.all([
      readFileAsDataUrl(monograph),
      annexes ? readFileAsDataUrl(annexes) : Promise.resolve(undefined)
    ]);

    const docMonograph: FileDocument = {
      id: crypto.randomUUID(),
      name: monograph.name.replace('.pdf', ''),
      url: monographUrl,
      uploadDate: dateStr,
      type: DocumentType.CORRECCION,
      status: stateList.EN_REVISION
    };
    const docAnnexes: FileDocument | undefined = annexes && annexesUrl
      ? {
          id: crypto.randomUUID(),
          name: annexes.name,
          url: annexesUrl,
          uploadDate: dateStr,
          type: DocumentType.CORRECCION,
          status: stateList.EN_REVISION
        }
      : undefined;

    return { docMonograph, docAnnexes };
  }

  // Sin cambios: recibe un FileDocument ya construido por quien llama —
  // no fabrica ninguna URL, la responsabilidad es del llamador.
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
          notifyUserIds = collectParticipantIds(proposal);
          let updatedDeliveries = thesisWork.finalDeliveries ?? [];
          if (updatedDeliveries.length > 0) {
            updatedDeliveries = updatedDeliveries.map((delivery, index) =>
              index === 0
                ? {
                    ...delivery,
                    status:   stateList.APROBADO,
                    monograph: { ...delivery.monograph, status: stateList.APROBADO },
                    formatE: { ...delivery.formatE,   status: stateList.APROBADO },
                    annexes: delivery.annexes ? { ...delivery.annexes, status: stateList.APROBADO } : undefined
                  }
                : delivery
            );
          }
          thesisWork.preliminaryDraftData?.evaluators?.forEach((evaluator: User) => {
            if (evaluator.id) evaluatorIdsToClean.push(evaluator.id);
          });
          thesisWork.sustentations?.forEach(sust => {
            sust.assignedJurors?.forEach((juror: User) => {
              if (juror.id) jurorIdsToClean.push(juror.id);
            });
          });
          return {
            ...thesisWork,
            documents: [document, ...(thesisWork.documents ?? [])],
            finalDeliveries: updatedDeliveries,
            isArchived: true
          };
        });
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
          type: AppEventType.THESIS_CORRESPONDENCE_REGISTERED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: { thesisId: thesisWorkId, thesisTitle: currentThesisTitle }
        });
      })
    );
  }
}
