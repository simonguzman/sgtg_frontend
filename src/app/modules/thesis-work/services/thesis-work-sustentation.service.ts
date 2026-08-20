import { inject, Injectable } from '@angular/core';
import { catchError, delay, forkJoin, from, map, Observable, of, switchMap, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { UserService } from '../../users/services/user.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { SustentationRegistry } from '../interfaces/sustentation-registry.interface';
import { JurorVerdict } from '../interfaces/juror-verdict.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { SustentationFormData } from '../interfaces/sustentation-form-data.interface';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';
import { formatThesisDate } from '../helpers/thesis-date.helper';
import { readFileAsDataUrl } from '../../../core/utils/file-reader.utils';

export type SustentationVeredict =
  | stateList.APROBADO
  | stateList.APROBADO_CON_OBSERVACIONES
  | stateList.NO_APROBADO
  | stateList.APLAZADO;

@Injectable({ providedIn: 'root' })
export class ThesisWorkSustentationService {
  private readonly storage     = inject(ThesisWorkStorageService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly eventBus    = inject(EventBusService);

  /**
   * ← FIX CENTRAL: antes `url: uploadedFile?.url ?? 'uploads/sustentaciones/...'`.
   * uploadedFile SIEMPRE es un File crudo en el único llamador real
   * (RegisterSustentationFacadeService), y File no tiene `.url` — por lo
   * que el fallback de ruta falsa se ejecutaba el 100% de las veces, no
   * como caso excepcional. Se usa from(...) + switchMap() para leer el
   * File real ANTES de construir el documento — mismo patrón ya aplicado
   * en ThesisWorkDeliveryService.
   */
  saveSustentationRegistryMock(
    thesisWorkId: string,
    formData: SustentationFormData
  ): Observable<void> {
    const dateStr = formatThesisDate();

    return from(this.buildSustentationFormatEDocument(formData.formatEDocument, dateStr)).pipe(
      switchMap((sustentationDoc) =>
        of(undefined).pipe(
          delay(1000),
          tap(() => {
            let notifyUserIds: string[] = [];
            let currentThesisTitle = '';
            const newSustentationId = crypto.randomUUID();

            if (formData.juror1) this.userService.addRoleToUser(formData.juror1, UserRoleType.JURADO);
            if (formData.juror2) this.userService.addRoleToUser(formData.juror2, UserRoleType.JURADO);

            this.storage.updateWork(thesisWorkId, (thesisWork) => {
              const proposal = thesisWork.preliminaryDraftData?.proposalData;
              currentThesisTitle = proposal?.title ?? '';
              notifyUserIds      = collectParticipantIds(proposal);
              if (formData.juror1) notifyUserIds.push(formData.juror1);
              if (formData.juror2) notifyUserIds.push(formData.juror2);

              const allUsers   = this.userService.users();
              const juror1User = allUsers.find(u => u.id === formData.juror1);
              const juror2User = allUsers.find(u => u.id === formData.juror2);

              const sustentationRegistry: SustentationRegistry = {
                id:               newSustentationId,
                sustentationDate: formData.sustentationDate ? new Date(formData.sustentationDate) : undefined,
                sustentationTime: formData.sustentationTime,
                location:         formData.location,
                assignedJurors:   [
                  ...(juror1User ? [juror1User] : []),
                  ...(juror2User ? [juror2User] : [])
                ],
                verdicts:        [],
                formatEDocument: sustentationDoc
              };

              return {
                ...thesisWork,
                sustentations: [sustentationRegistry, ...(thesisWork.sustentations ?? [])],
                documents:     [sustentationDoc,       ...(thesisWork.documents     ?? [])]
              };
            });

            this.eventBus.emit({
              type:          AppEventType.THESIS_SUSTENTATION_PROGRAMMED,
              targetUserIds: [...new Set(notifyUserIds)],
              payload: {
                thesisId:       thesisWorkId,
                thesisTitle:    currentThesisTitle,
                sustentationId: newSustentationId
              }
            });
          })
        )
      )
    );
  }

  private async buildSustentationFormatEDocument(
    uploadedFile: SustentationFormData['formatEDocument'],
    dateStr: string
  ): Promise<FileDocument> {
    if (uploadedFile instanceof File) {
      return {
        id:         crypto.randomUUID(),
        name:       uploadedFile.name,
        url:        await readFileAsDataUrl(uploadedFile),
        uploadDate: dateStr,
        type:       DocumentType.FORMATO_E,
        status:     stateList.EN_REVISION
      };
    }
    // Rama defensiva: en la práctica este bloque nunca se ejecuta — el
    // único llamador real siempre pasa un File crudo (ver comentario en
    // RegisterSustentationFacadeService). Se conserva por si el tipo
    // SustentationFormData.formatEDocument alguna vez acepta otra forma
    // (p. ej. un FileDocument ya resuelto). Antes el fallback de url era
    // una ruta falsa; ahora es '' — más honesto que fingir una ruta que
    // no lleva a ningún archivo real.
    const fileName = uploadedFile?.name ?? uploadedFile?.fileName ?? 'Formato_E_Programacion.pdf';
    return {
      id:         uploadedFile?.id ?? crypto.randomUUID(),
      name:       fileName,
      url:        uploadedFile?.url ?? '',
      uploadDate: dateStr,
      type:       DocumentType.FORMATO_E,
      status:     stateList.EN_REVISION
    };
  }

  /**
   * ← FIX CENTRAL: antes `url: 'uploads/sustentaciones/resultado_...'`.
   * Mismo patrón from(...) + switchMap() — se lee el File real primero,
   * y TODO lo que ya existía (el tap() de guardado + el switchMap() de
   * limpieza de roles) queda intacto como una etapa interna más.
   */
  registerSustentationVerdictMock(
    thesisWorkId: string,
    payload: { veredict: SustentationVeredict; observations: string; evaluationDate: Date },
    file: File
  ): Observable<void> {
    let notifyUserIds: string[] = [];
    let currentThesisTitle = '';
    let currentSustentationId = '';
    const evaluatorIdsToClean: string[] = [];
    const jurorIdsToClean: string[] = [];
    let thesisArchived = false;
    const jurorId = this.authService.currentUser()?.id ?? 'jurado-desconocido';

    return from(readFileAsDataUrl(file)).pipe(
      switchMap((fileUrl) =>
        of(undefined).pipe(
          delay(1000),
          tap(() => {
            this.storage.updateWork(thesisWorkId, (thesisWork) => {
              const proposal = thesisWork.preliminaryDraftData?.proposalData;
              const isFailed = payload.veredict === stateList.NO_APROBADO;
              thesisArchived     = isFailed;
              currentThesisTitle = proposal?.title ?? '';
              notifyUserIds      = collectParticipantIds(proposal);
              notifyUserIds.push(
                ...this.userService.users()
                  .filter(u => u.roles?.includes(UserRoleType.CONSEJO))
                  .map(u => u.id)
              );

              if (isFailed) {
                thesisWork.preliminaryDraftData?.evaluators?.forEach((ev: User) => {
                  if (ev.id) evaluatorIdsToClean.push(ev.id);
                });
                thesisWork.sustentations?.forEach(sust => {
                  sust.assignedJurors?.forEach((juror: User) => {
                    if (juror.id) jurorIdsToClean.push(juror.id);
                  });
                });
              }

              const sustentationFileDoc: FileDocument = {
                id:         crypto.randomUUID(),
                name:       file.name.replace('.pdf', ''),
                url:        fileUrl,
                uploadDate: formatThesisDate(),
                type:       DocumentType.FORMATO_G,
                status:     payload.veredict
              };

              const updatedExistingDocuments = (thesisWork.documents ?? []).map(doc =>
                doc.type === DocumentType.FORMATO_E && doc.status === stateList.EN_REVISION
                  ? { ...doc, status: stateList.EVALUADO }
                  : doc
              );

              const newVerdict: JurorVerdict = {
                jurorId,
                evaluationDate:   payload.evaluationDate,
                veredict:         payload.veredict,
                observations:     payload.observations,
                attachedDocument: sustentationFileDoc
              };

              const currentSustentations = thesisWork.sustentations ?? [];
              const activeSustentation   = currentSustentations.length > 0
                ? { ...currentSustentations[0] }
                : { id: crypto.randomUUID(), assignedJurors: [], verdicts: [] };

              const updatedVerdicts = [...(activeSustentation.verdicts ?? [])];
              const existingIndex   = updatedVerdicts.findIndex(v => v.jurorId === jurorId);
              currentSustentationId = activeSustentation.id;

              if (existingIndex !== -1) {
                updatedVerdicts[existingIndex] = newVerdict;
              } else {
                updatedVerdicts.push(newVerdict);
              }
              activeSustentation.verdicts = updatedVerdicts;

              const updatedSustentations = currentSustentations.length > 0
                ? [activeSustentation, ...currentSustentations.slice(1)]
                : [activeSustentation];

              return {
                ...thesisWork,
                sustentations: updatedSustentations,
                documents:     [sustentationFileDoc, ...updatedExistingDocuments],
                state:         payload.veredict,
                isArchived:    isFailed
              };
            });

            this.eventBus.emit({
              type:          AppEventType.THESIS_VERDICT_REGISTERED,
              targetUserIds: [...new Set(notifyUserIds)],
              payload: {
                thesisId:       thesisWorkId,
                thesisTitle:    currentThesisTitle,
                veredict:       payload.veredict,
                sustentationId: currentSustentationId
              }
            });
          }),
          switchMap(() => {
            if (!thesisArchived) return of(undefined);
            const cleanupOperations: Observable<void>[] = [];
            if (evaluatorIdsToClean.length > 0) {
              cleanupOperations.push(
                this.userService.removeRolesFromUsersMock(
                  [...new Set(evaluatorIdsToClean)], [UserRoleType.EVALUADOR]
                )
              );
            }
            if (jurorIdsToClean.length > 0) {
              cleanupOperations.push(
                this.userService.removeRolesFromUsersMock(
                  [...new Set(jurorIdsToClean)], [UserRoleType.JURADO]
                )
              );
            }
            if (cleanupOperations.length === 0) return of(undefined);
            return forkJoin(cleanupOperations).pipe(
              map(() => undefined),
              catchError(err => {
                console.error('Error al limpiar roles tras el veredicto de sustentación:', err);
                return of(undefined);
              })
            );
          })
        )
      )
    );
  }

  /**
   * ← FIX CENTRAL (doble bug): 1) url falsa, mismo patrón de siempre.
   * 2) `signedDocuments: [docFormatG.url]` era un string[] — ya NO
   * compila contra Evaluation.signedDocuments (FormattedDocument[]).
   * Ambos se resuelven leyendo el File real primero.
   */
  evaluateCorrectedDocumentsMock(
    thesisWorkId: string,
    evaluationData: Omit<Evaluation, 'id' | 'date'>,
    formatGFile: File
  ): Observable<void> {
    const jurorId = this.authService.currentUser()?.id ?? 'jurado-desconocido';
    const dateStr = formatThesisDate();

    return from(readFileAsDataUrl(formatGFile)).pipe(
      switchMap((fileUrl) =>
        of(undefined).pipe(
          delay(1200),
          tap(() => {
            let notifyUserIds: string[] = [];
            let currentThesisTitle = '';

            const docFormatG: FileDocument = {
              id:         crypto.randomUUID(),
              name:       formatGFile.name,
              url:        fileUrl,
              uploadDate: dateStr,
              type:       DocumentType.CORRECCION,
              status:     evaluationData.veredict
            };

            this.storage.updateWork(thesisWorkId, (thesisWork) => {
              const proposal = thesisWork.preliminaryDraftData?.proposalData;
              currentThesisTitle = proposal?.title ?? '';
              notifyUserIds      = collectParticipantIds(proposal);
              notifyUserIds.push(
                ...this.userService.users()
                  .filter(u => u.roles?.includes(UserRoleType.CONSEJO))
                  .map(u => u.id)
              );

              const newEvaluation: Evaluation = {
                ...evaluationData,
                id:   crypto.randomUUID(),
                date: new Date(),
                // ← FIX: string[] → FormattedDocument[]
                signedDocuments: [{ name: docFormatG.name, url: docFormatG.url }]
              };

              const currentSustentations = thesisWork.sustentations ?? [];
              const activeSustentation   = currentSustentations.length > 0
                ? { ...currentSustentations[0] }
                : { id: crypto.randomUUID(), assignedJurors: [], verdicts: [] };

              const updatedJurorVerdict: JurorVerdict = {
                jurorId,
                evaluationDate:   new Date(),
                veredict:         evaluationData.veredict as SustentationVeredict,
                observations:     evaluationData.observations,
                attachedDocument: docFormatG
              };
              activeSustentation.verdicts = [...(activeSustentation.verdicts ?? []), updatedJurorVerdict];

              const updatedSustentations = currentSustentations.length > 0
                ? [activeSustentation, ...currentSustentations.slice(1)]
                : [activeSustentation];

              let updatedCorrectedDeliveries = [...(thesisWork.correctedDeliveries ?? [])];
              if (updatedCorrectedDeliveries.length > 0) {
                const latest = updatedCorrectedDeliveries[0];
                updatedCorrectedDeliveries[0] = {
                  ...latest,
                  status:    evaluationData.veredict,
                  monograph: { ...latest.monograph, status: evaluationData.veredict }
                };
              }

              const finalThesisState = evaluationData.veredict === stateList.APROBADO
                ? stateList.APROBADO_CON_OBSERVACIONES
                : stateList.APLAZADO;

              return {
                ...thesisWork,
                state:               finalThesisState,
                sustentations:       updatedSustentations,
                documents:           [docFormatG, ...(thesisWork.documents ?? [])],
                evaluations:         [newEvaluation, ...(thesisWork.evaluations ?? [])],
                correctedDeliveries: updatedCorrectedDeliveries
              };
            });

            this.eventBus.emit({
              type:          AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED,
              targetUserIds: [...new Set(notifyUserIds)],
              payload: {
                thesisId:    thesisWorkId,
                thesisTitle: currentThesisTitle,
                veredict:    evaluationData.veredict
              }
            });
          })
        )
      )
    );
  }
}
