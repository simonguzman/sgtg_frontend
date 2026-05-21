import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../users/services/user.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';

import { stateList } from '../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../core/interfaces/Document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { UserRoleType } from '../../../core/models/user-role';

import { ThesisWork, SustentationRegistry, JurorVerdict, SpecialRequest } from '../interfaces/thesis-work.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkService {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);

  // 📌 Señal reactiva contenedora de los datos en memoria
  private readonly _thesisWorksList = signal<ThesisWork[]>(this.initializeThesisWorks());

  public thesisWorks = computed(() => {
    const currentUser = this.authService.currentUser();
    const allWorks = this._thesisWorksList();
    if (!currentUser) return [];
    if (this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DECANATURA,
      UserRoleType.CONSEJO
    ])) {
      return allWorks;
    }
    return allWorks.filter(work => this.canUserAccessThesisWork(work, currentUser.id));
  });

  constructor() {
    effect(() => {
      localStorage.setItem('thesisWorks', JSON.stringify(this._thesisWorksList()));
    });
  }

  private initializeThesisWorks(): ThesisWork[] {
    const stored = localStorage.getItem('thesisWorks');
    if (stored) return JSON.parse(stored);
    const approvedPreliminaryDrafts = this.preliminaryDraftService.preliminaryDrafts()
      .filter(preliminaryDraft => preliminaryDraft.state === stateList.APROBADO);
    return approvedPreliminaryDrafts.map(preliminaryDraft => ({
      thesisWorkId: crypto.randomUUID(),
      preliminaryDraftId: preliminaryDraft.preliminaryDraftId!,
      preliminaryDraftData: preliminaryDraft,
      documents: [],
      advances: [],
      evaluations: [],
      sustentations: [], // 👈 Inicializado como arreglo
      specialRequests: [],
      state: stateList.EN_DESARROLLO,
      createdDate: new Date()
    }));
  }

  private canUserAccessThesisWork(work: ThesisWork, userId: string): boolean {
    const proposal = work.preliminaryDraftData.proposalData;
    const isDirector = proposal.director?.id === userId;
    const isCodirector = proposal.codirector?.id === userId;
    const isAdvisor = proposal.advisor?.id === userId;
    const isAuthor = proposal.authors?.some(author =>
      typeof author === 'string' ? author === userId : (author as any)?.id === userId
    ) ?? false;

    // 👈 Búsqueda en el arreglo histórico de sustentaciones
    const isJuror = work.sustentations?.some(s =>
      s.assignedJurors?.some(juror => juror.id === userId)
    ) ?? false;

    return isDirector || isCodirector || isAdvisor || isAuthor || isJuror;
  }

  getThesisWorkByIdMock(id: string): Observable<ThesisWork | undefined> {
    return of(this._thesisWorksList().find(w => w.thesisWorkId === id)).pipe(delay(500));
  }

  uploadDocumentMock(thesisWorkId: string, document: Document, advanceMeta?: { title: string; comments: string; studentId: string }): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this._thesisWorksList.update(list => list.map(work => {
          if (work.thesisWorkId !== thesisWorkId) return work;

          if ((document.type as string) !== 'Avance') {
            const nextState = document.type === 'Formato' ? stateList.EN_REVISION : work.state;
            return {
              ...work,
              documents: [document, ...work.documents],
              state: nextState
            };
          }

          const existingAdvances = work.advances || [];
          const advanceExists = existingAdvances.some(adv => adv.id === document.id);

          let updatedAdvances;
          if (advanceExists) {
            updatedAdvances = existingAdvances.map(adv => {
              if (adv.id !== document.id) return adv;
              return {
                ...adv,
                documents: [...adv.documents, document]
              };
            });
          } else {
            const newAdvance = {
              id: document.id,
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
            ...work,
            advances: updatedAdvances,
            state: work.state
          };
        }));
      })
    );
  }

  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation): Observable<void> {
  return of(undefined).pipe(
    delay(800),
    tap(() => {
      this._thesisWorksList.update(list => list.map(work => {
        if (work.thesisWorkId !== thesisWorkId) return work;

        // Actualizamos el estado del avance específico que se evaluó
        const updatedAdvances = (work.advances || []).map(adv => {
          if (adv.id !== evaluation.documentId) return adv;
          return {
            ...adv,
            status: evaluation.veredict // Cambia a EVALUADO o EN_REVISION según el veredicto
          };
        });

        return {
          ...work,
          advances: updatedAdvances,
          evaluations: [evaluation, ...(work.evaluations || [])]
        };
      }));
    })
  );
}

  saveSustentationRegistryMock(thesisWorkId: string, formData: any): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        if (formData.juror1) {
          this.userService.addRoleToUser(formData.juror1, UserRoleType.JURADO);
        }
        if (formData.juror2) {
          this.userService.addRoleToUser(formData.juror2, UserRoleType.JURADO);
        }
        this._thesisWorksList.update(list => list.map(work => {
          if (work.thesisWorkId !== thesisWorkId) return work;
          const allUsers = this.userService.users();
          const juror1User = allUsers.find(user => user.id === formData.juror1);
          const juror2User = allUsers.find(user => user.id === formData.juror2);
          const dateStr = new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).replaceAll('/', ' - ');

          const sustentationDoc: Document = {
            id: formData.formatEDocument?.id || crypto.randomUUID(),
            name: formData.formatEDocument?.fileName || 'Formato E - Sustentación',
            url: formData.formatEDocument?.url || 'uploads/sustentation/formato_e_registro.pdf',
            uploadDate: dateStr,
            type: DocumentType['FORMATO E'] || ('Formato E' as any),
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
            verdicts: []
          };

          return {
            ...work,
            // 👈 Mantenemos el historial de sustentaciones insertando al inicio
            sustentations: [sustentationRegistry, ...(work.sustentations || [])],
            documents: [sustentationDoc, ...(work.documents || [])],
            state: work.state
          };
        }));
      })
    );
  }

  uploadFinalDeliveryMock(thesisWorkId: string, monograph: File, formatE: File, annexes?: File): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this._thesisWorksList.update(list => list.map(work => {
          if (work.thesisWorkId !== thesisWorkId) return work;
          const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');

          const docMonograph: Document = {
            id: crypto.randomUUID(),
            name: monograph.name.replace('.pdf', ''),
            url: 'uploads/final-delivery/monografia_' + monograph.name,
            uploadDate: dateStr,
            type: DocumentType.MONONGRAFIA,
            status: stateList.EN_REVISION
          };

          const docFormatE: Document = {
            id: crypto.randomUUID(),
            name: formatE.name.replace('.pdf', ''),
            url: 'uploads/final-delivery/formato_e_' + formatE.name,
            uploadDate: dateStr,
            type: DocumentType['FORMATO E'],
            status: stateList.EN_REVISION
          };

          const newDocuments = [docMonograph, docFormatE];
          if (annexes) {
            newDocuments.push({
              id: crypto.randomUUID(),
              name: annexes.name,
              url: 'uploads/final-delivery/anexos_' + annexes.name,
              uploadDate: dateStr,
              type: 'Anexos' as any,
              status: stateList.EN_REVISION
            });
          }
          return {
            ...work,
            documents: [...newDocuments, ...(work.documents || [])],
            state: stateList.EN_REVISION
          };
        }));
      })
    );
  }

  registerPazYSalvoMock(
    thesisWorkId: string,
    payload: { academicApproved: boolean, academicComments?: string, financialApproved: boolean, financialComments?: string },
    file: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this._thesisWorksList.update(list => list.map(work => {
          if (work.thesisWorkId !== thesisWorkId) return work;
          const isFullyApproved = payload.academicApproved && payload.financialApproved;
          const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');
          const docId = crypto.randomUUID();

          const pazYSalvoDoc: Document = {
            id: docId,
            name: file.name.replace('.pdf', ''),
            url: 'uploads/paz-y-salvo/' + file.name,
            uploadDate: dateStr,
            type: DocumentType['PAZ Y SALVO'],
            status: isFullyApproved ? stateList.APROBADO : stateList.NO_APROBADO
          };

          let updatedDocuments = [pazYSalvoDoc, ...(work.documents || [])];
          if (!isFullyApproved) {
            updatedDocuments = updatedDocuments.map(doc => {
              if (doc.type === DocumentType['FORMATO E']) {
                return { ...doc, status: stateList.NO_APROBADO };
              }
              return doc;
            });
          }

          return {
            ...work,
            pazYSalvo: {
              id: crypto.randomUUID(),
              ...payload,
              documentId: docId,
              registrationDate: new Date()
            },
            documents: updatedDocuments
          };
        }));
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

        this._thesisWorksList.update(list => list.map(work => {
          if (work.thesisWorkId !== thesisWorkId) return work;

          const dateStr = new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).replaceAll('/', ' - ');

          const sustentationFileDoc: Document = {
            id: crypto.randomUUID(),
            name: file.name.replace('.pdf', ''),
            url: `uploads/sustentaciones/resultado_${file.name}`,
            uploadDate: dateStr,
            type: DocumentType['FORMATO G'] || ('Formato G' as any),
            status: payload.veredict
          };

          const updatedExistingDocuments = (work.documents || []).map(doc => {
            const isFormatoE = doc.type === (DocumentType['FORMATO E'] || 'Formato E');
            const isEnRevision = doc.status === stateList.EN_REVISION;

            if (isFormatoE && isEnRevision) {
              return {
                ...doc,
                status: stateList.EVALUADO || ('Evaluado' as any)
              };
            }
            return doc;
          });

          const newVerdict: JurorVerdict = {
            jurorId: jurorId,
            evaluationDate: payload.evaluationDate,
            veredict: payload.veredict as any,
            observations: payload.observations
          };

          // 👈 Modificamos solo la sustentación activa (la de la posición 0)
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

          // 👈 Ensamblamos la sustentación activa con el resto del historial
          const updatedSustentations = currentSustentations.length > 0
            ? [activeSustentation, ...currentSustentations.slice(1)]
            : [activeSustentation];

          return {
            ...work,
            sustentations: updatedSustentations, // Asignamos el arreglo
            documents: [sustentationFileDoc, ...updatedExistingDocuments],
            state: payload.veredict
          };
        }));
      })
    );
  }

  uploadCorrectedDocumentsMock(thesisWorkId: string, monograph: File, annexes?: File): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this._thesisWorksList.update(list => list.map(work => {
          if (work.thesisWorkId !== thesisWorkId) return work;
          const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');

          const docMonograph: Document = {
            id: crypto.randomUUID(),
            name: monograph.name.replace('.pdf', ''),
            url: 'uploads/corrected-documents/' + monograph.name,
            uploadDate: dateStr,
            type: DocumentType.CORRECCION,
            status: stateList.EN_REVISION
          };

          const newDocuments = [docMonograph];
          if (annexes) {
            newDocuments.push({
              id: crypto.randomUUID(),
              name: annexes.name,
              url: 'uploads/corrected-documents/' + annexes.name,
              uploadDate: dateStr,
              type: DocumentType.CORRECCION,
              status: stateList.EN_REVISION
            });
          }
          return {
            ...work,
            documents: [...newDocuments, ...(work.documents || [])],
            state: stateList.EN_REVISION
          };
        }));
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

        this._thesisWorksList.update(list => list.map(work => {
          if (work.thesisWorkId !== thesisWorkId) return work;

          const docFormatG: Document = {
            id: crypto.randomUUID(),
            name: `Formato G - Acta de Sustentación`,
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

          // 👈 Aplicamos la misma lógica del historial para mantener la estructura
          const currentSustentations = work.sustentations || [];
          const activeSustentation = currentSustentations.length > 0
            ? { ...currentSustentations[0] }
            : { id: crypto.randomUUID(), assignedJurors: [], verdicts: [] };

          const updatedJurorVerdict = {
            jurorId: jurorId,
            evaluationDate: new Date(),
            veredict: evaluationData.veredict as any,
            observations: evaluationData.observations
          };

          const updatedVerdicts = [...(activeSustentation.verdicts || [])];
          const existingVerdictIndex = updatedVerdicts.findIndex(v => v.jurorId === jurorId);

          if (existingVerdictIndex !== -1) {
            updatedVerdicts[existingVerdictIndex] = updatedJurorVerdict;
          } else {
            updatedVerdicts.push(updatedJurorVerdict);
          }

          activeSustentation.verdicts = updatedVerdicts;

          const updatedSustentations = currentSustentations.length > 0
            ? [activeSustentation, ...currentSustentations.slice(1)]
            : [activeSustentation];

          return {
            ...work,
            state: evaluationData.veredict,
            sustentations: updatedSustentations, // Asignamos el arreglo
            documents: [docFormatG, ...(work.documents || [])],
            evaluations: [newEvaluation, ...(work.evaluations || [])]
          };
        }));
      })
    );
  }

  registerCorrespondenceDocumentMock(thesisWorkId: string, document: Document): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this._thesisWorksList.update(list =>
          list.map((work: ThesisWork) => {
            if (work.thesisWorkId !== thesisWorkId) return work;
            return {
              ...work,
              documents: [document, ...(work.documents || [])],
              state: stateList.APROBADO
            };
          })
        );
      })
    );
  }

  createSpecialRequestMock(payload: { requestType: string, comments: string, thesisId: string }): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this._thesisWorksList.update(list =>
          list.map((work: ThesisWork) => {
            if (work.thesisWorkId !== payload.thesisId) return work;
            const newRequest: SpecialRequest = {
              id: crypto.randomUUID(),
              directorId: work.preliminaryDraftData?.proposalData?.director?.id || '',
              requestDate: new Date(),
              description: `[${payload.requestType}] - ${payload.comments}`,
              status: stateList.EN_REVISION
            };
            return {
              ...work,
              specialRequests: [newRequest, ...(work.specialRequests || [])]
            };
          })
        );
      })
    );
  }

  evaluateSpecialRequestMock(
    thesisWorkId: string,
    requestId: string,
    payload: { status: stateList.APROBADO | stateList.NO_APROBADO; resolutionDetails: string }
  ): Observable<void> {
    return of(undefined).pipe(
      delay(900),
      tap(() => {
        this._thesisWorksList.update(list =>
          list.map((work: ThesisWork) => {
            if (work.thesisWorkId !== thesisWorkId) return work;
            const updatedRequests = (work.specialRequests || []).map(req => {
              if (req.id !== requestId) return req;
              return {
                ...req,
                status: payload.status,
                resolutionDetails: payload.resolutionDetails
              };
            });
            return {
              ...work,
              specialRequests: updatedRequests
            };
          })
        );
      })
    );
  }
}
