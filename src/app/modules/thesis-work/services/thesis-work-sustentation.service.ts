import { inject, Injectable } from '@angular/core';
import { delay, first, Observable, of, tap } from 'rxjs';
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
// ← UserApiService eliminado: reemplazado por userService.removeRolesFromUsersMock de forma consistente

// Tipo para los veredictos válidos en una sustentación — evita los casts `as any`
// que antes forzaban el compilador a ignorar la incompatibilidad de tipos.
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

  // ← formData: any → SustentationFormData (type-safety sin casts)
  saveSustentationRegistryMock(
    thesisWorkId: string,
    formData: SustentationFormData
  ): Observable<void> {
    return of(undefined).pipe(
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

          const allUsers  = this.userService.users();
          const juror1User = allUsers.find(u => u.id === formData.juror1);
          const juror2User = allUsers.find(u => u.id === formData.juror2);

          const dateStr        = formatThesisDate();
          const uploadedFile   = formData.formatEDocument;
          const fileName       = uploadedFile?.name ?? uploadedFile?.fileName ?? 'Formato_E_Programacion.pdf';

          const sustentationDoc: FileDocument = {
            id:         uploadedFile?.id ?? crypto.randomUUID(),
            name:       fileName,
            url:        uploadedFile?.url ?? `uploads/sustentaciones/${fileName}`,
            uploadDate: dateStr,
            type:       DocumentType.FORMATO_E,
            status:     stateList.EN_REVISION
          };

          const sustentationRegistry: SustentationRegistry = {
            id:              newSustentationId,
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
    );
  }

  // ← payload.veredict: stateList → SustentationVeredict (elimina `as any` en JurorVerdict)
  registerSustentationVerdictMock(
    thesisWorkId: string,
    payload: { veredict: SustentationVeredict; observations: string; evaluationDate: Date },
    file: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = '';
        let currentSustentationId = '';
        const evaluatorIdsToClean: string[] = [];
        const jurorIdsToClean: string[]     = [];
        let thesisArchived = false;

        const jurorId = this.authService.currentUser()?.id ?? 'jurado-desconocido';

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

          const dateStr = formatThesisDate();

          const sustentationFileDoc: FileDocument = {
            id:         crypto.randomUUID(),
            name:       file.name.replace('.pdf', ''),
            url:        `uploads/sustentaciones/resultado_${file.name}`,
            uploadDate: dateStr,
            type:       DocumentType.FORMATO_G,
            status:     payload.veredict
          };

          const updatedExistingDocuments = (thesisWork.documents ?? []).map(doc =>
            doc.type === DocumentType.FORMATO_E && doc.status === stateList.EN_REVISION
              ? { ...doc, status: stateList.EVALUADO }
              : doc
          );

          // ← payload.veredict ya es SustentationVeredict, no se necesita cast
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

        // ← UserService.removeRolesFromUsersMock usado de forma consistente para ambos roles
        // ← first() agregado para completar la suscripción tras la primera emisión
        if (thesisArchived) {
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
        }

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
      })
    );
  }

  evaluateCorrectedDocumentsMock(
    thesisWorkId: string,
    evaluationData: Omit<Evaluation, 'id' | 'date'>,
    formatGFile: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1200),
      tap(() => {
        let notifyUserIds: string[] = [];
        let currentThesisTitle = '';
        const jurorId  = this.authService.currentUser()?.id ?? 'jurado-desconocido';
        const dateStr  = formatThesisDate();

        this.storage.updateWork(thesisWorkId, (thesisWork) => {
          const proposal = thesisWork.preliminaryDraftData?.proposalData;
          currentThesisTitle = proposal?.title ?? '';
          notifyUserIds      = collectParticipantIds(proposal);

          notifyUserIds.push(
            ...this.userService.users()
              .filter(u => u.roles?.includes(UserRoleType.CONSEJO))
              .map(u => u.id)
          );

          const docFormatG: FileDocument = {
            id:         crypto.randomUUID(),
            name:       formatGFile.name,
            url:        `uploads/evaluations/${formatGFile.name}`,
            uploadDate: dateStr,
            type:       DocumentType.CORRECCION,
            // ← Cast `as stateList` eliminado: evaluationData.veredict ya es stateList
            status:     evaluationData.veredict
          };

          const newEvaluation: Evaluation = {
            ...evaluationData,
            id:              crypto.randomUUID(),
            date:            new Date(),
            signedDocuments: [docFormatG.url]
          };

          const currentSustentations = thesisWork.sustentations ?? [];
          const activeSustentation   = currentSustentations.length > 0
            ? { ...currentSustentations[0] }
            : { id: crypto.randomUUID(), assignedJurors: [], verdicts: [] };

          // ← Cast `as any` reemplazado por SustentationVeredict
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
            // ← Cast `as stateList` eliminado: evaluationData.veredict ya es stateList
            updatedCorrectedDeliveries[0] = {
              ...latest,
              status:   evaluationData.veredict,
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
    );
  }
}
