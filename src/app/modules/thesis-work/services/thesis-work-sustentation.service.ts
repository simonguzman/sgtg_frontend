import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { UserService } from '../../users/services/user.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Document, DocumentType } from '../../../core/interfaces/Document.interface';
import { SustentationRegistry, JurorVerdict } from '../interfaces/thesis-work.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/models/user-role';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkSustentationService {
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly eventBus = inject(EventBusService);

  saveSustentationRegistryMock(thesisWorkId: string, formData: any): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        if (formData.juror1) this.userService.addRoleToUser(formData.juror1, UserRoleType.JURADO);
        if (formData.juror2) this.userService.addRoleToUser(formData.juror2, UserRoleType.JURADO);

        this.storage.updateWork(thesisWorkId, (work) => {
          const allUsers = this.userService.users();
          const juror1User = allUsers.find(user => user.id === formData.juror1);
          const juror2User = allUsers.find(user => user.id === formData.juror2);

          const dateStr = new Date().toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          }).replaceAll('/', ' - ');

          const uploadedFile = formData.formatEDocument;
          const fileName = uploadedFile?.name || uploadedFile?.fileName || 'Formato_E_Programacion.pdf';

          const sustentationDoc: Document = {
            id: uploadedFile?.id || crypto.randomUUID(),
            name: fileName,
            url: uploadedFile?.url || `uploads/sustentaciones/${fileName}`,
            uploadDate: dateStr,
            type: DocumentType.FORMATO_E,
            status: stateList.EN_REVISION
          };

          const sustentationRegistry: SustentationRegistry = {
            id: crypto.randomUUID(),
            sustentationDate: formData.sustentationDate ? new Date(formData.sustentationDate) : undefined,
            sustentationTime: formData.sustentationTime || undefined,
            location: formData.location || undefined,
            assignedJurors: [
              ...(juror1User ? [juror1User] : []),
              ...(juror2User ? [juror2User] : [])
            ],
            verdicts: [],
            formatEDocument: sustentationDoc
          };

          return {
            ...work,
            sustentations: [sustentationRegistry, ...(work.sustentations || [])],
            documents: [sustentationDoc, ...(work.documents || [])]
          };
        });

        this.eventBus.emit({
          type: AppEventType.THESIS_SUSTENTATION_PROGRAMMED,
          payload: { thesisId: thesisWorkId }
        });
      })
    );
  }

  registerSustentationVerdictMock(
    thesisWorkId: string,
    payload: { veredict: stateList; observations: string; evaluationDate: Date },
    file: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        const activeUser = this.authService.currentUser();
        const jurorId = activeUser ? activeUser.id : 'jurado-desconocido';

        this.storage.updateWork(thesisWorkId, (work) => {
          const dateStr = new Date().toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          }).replaceAll('/', ' - ');

          const sustentationFileDoc: Document = {
            id: crypto.randomUUID(),
            name: file.name.replace('.pdf', ''),
            url: `uploads/sustentaciones/resultado_${file.name}`,
            uploadDate: dateStr,
            type: DocumentType.FORMATO_G,
            status: payload.veredict
          };

          const updatedExistingDocuments = (work.documents || []).map(doc => {
            const isFormatoE = doc.type === (DocumentType.FORMATO_E);
            const isEnRevision = doc.status === stateList.EN_REVISION;
            return isFormatoE && isEnRevision ? { ...doc, status: stateList.EVALUADO } : doc;
          });

          const newVerdict: JurorVerdict = {
            jurorId: jurorId,
            evaluationDate: payload.evaluationDate,
            veredict: payload.veredict as any,
            observations: payload.observations,
            attachedDocument: sustentationFileDoc
          };

          const currentSustentations = work.sustentations || [];
          const activeSustentation = currentSustentations.length > 0
            ? { ...currentSustentations[0] }
            : { id: crypto.randomUUID(), assignedJurors: [], verdicts: [] };

          const updatedVerdicts = [...(activeSustentation.verdicts || [])];
          const existingVerdictIndex = updatedVerdicts.findIndex(v => v.jurorId === jurorId);

          if (existingVerdictIndex !== -1) {
            updatedVerdicts[existingVerdictIndex] = newVerdict;
          } else {
            updatedVerdicts.push(newVerdict);
          }

          activeSustentation.verdicts = updatedVerdicts;

          const updatedSustentations = currentSustentations.length > 0
            ? [activeSustentation, ...currentSustentations.slice(1)]
            : [activeSustentation];

          return {
            ...work,
            sustentations: updatedSustentations,
            documents: [sustentationFileDoc, ...updatedExistingDocuments],
            state: payload.veredict
          };
        });

        this.eventBus.emit({
          type: AppEventType.THESIS_VERDICT_REGISTERED,
          payload: { thesisId: thesisWorkId, veredict: payload.veredict }
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
        const activeUser = this.authService.currentUser();
        const jurorId = activeUser ? activeUser.id : 'jurado-desconocido';
        const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');

        this.storage.updateWork(thesisWorkId, (work) => {
          const docFormatG: Document = {
            id: crypto.randomUUID(),
            name: formatGFile.name,
            url: 'uploads/evaluations/' + formatGFile.name,
            uploadDate: dateStr,
            type: DocumentType.CORRECCION,
            status: evaluationData.veredict
          };

          const newEvaluation: Evaluation = {
            ...evaluationData,
            id: crypto.randomUUID(),
            date: new Date(),
            signedDocuments: [docFormatG.url]
          };

          const currentSustentations = work.sustentations || [];
          const activeSustentation = currentSustentations.length > 0
            ? { ...currentSustentations[0] }
            : { id: crypto.randomUUID(), assignedJurors: [], verdicts: [] };

          const updatedJurorVerdict: JurorVerdict = {
            jurorId: jurorId,
            evaluationDate: new Date(),
            veredict: evaluationData.veredict as any,
            observations: evaluationData.observations,
            attachedDocument: docFormatG
          };

          const updatedVerdicts = [...(activeSustentation.verdicts || []), updatedJurorVerdict];
          activeSustentation.verdicts = updatedVerdicts;

          const updatedSustentations = currentSustentations.length > 0
            ? [activeSustentation, ...currentSustentations.slice(1)]
            : [activeSustentation];

          // Actualizamos el estado del paquete de correcciones más reciente
          const updatedCorrectedDeliveries = [...(work.correctedDeliveries || [])];
          if (updatedCorrectedDeliveries.length > 0) {
            const latestDelivery = updatedCorrectedDeliveries[0];
            updatedCorrectedDeliveries[0] = {
              ...latestDelivery,
              status: evaluationData.veredict as stateList,
              monograph: {
                ...latestDelivery.monograph,
                status: evaluationData.veredict as stateList
              }
            };
          }

          return {
            ...work,
            state: evaluationData.veredict,
            sustentations: updatedSustentations,
            documents: [docFormatG, ...(work.documents || [])],
            evaluations: [newEvaluation, ...(work.evaluations || [])],
            correctedDeliveries: updatedCorrectedDeliveries
          };
        });

        this.eventBus.emit({
          type: AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED,
          payload: { thesisId: thesisWorkId, veredict: evaluationData.veredict }
        });
      })
    );
  }
}
