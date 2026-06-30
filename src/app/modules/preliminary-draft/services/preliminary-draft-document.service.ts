import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, tap } from 'rxjs';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { Document, DocumentType } from '../../../core/interfaces/Document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { addBusinessDays } from '../../../core/utils/date-utils';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryDraftDocumentService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);

  /**
   * Registra una evaluación de un jurado.
   * Se modificó para mantener intacto el estado general del anteproyecto (stateList.EN_REVISION),
   * evitando mutaciones prematuras antes de la decisión del Consejo de Facultad.
   */
  addEvaluationMock(preliminaryDraftId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let currentDraftTitle = '';
        const notifyUserIds: string[] = [];

        this.storage.updateDraft(preliminaryDraftId, (preliminaryDraft) => {
          const proposal = preliminaryDraft.proposalData;

          if (proposal) {
            // 💡 Captura segura del título real dentro del mutador
            currentDraftTitle = proposal.title || '';

            // 1. Autores
            proposal.authors?.forEach(author => {
              if (typeof author === 'string') notifyUserIds.push(author);
              else if (author?.id) notifyUserIds.push(author.id);
            });

            // 2. Equipo de apoyo
            if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
            if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
            if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);
          }

          const newEvaluations = [evaluation, ...(preliminaryDraft.evaluations || [])];
          return {
            ...preliminaryDraft,
            evaluations: newEvaluations,
            // 🔒 Preservamos el estado actual del anteproyecto sin alterarlo automáticamente
            state: preliminaryDraft.state
          };
        });

        // 3. Jefe de Departamento (Lectura externa limpia de servicios globales)
        const jefesDepto = this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.JEFE_DEP))
          .map(user => user.id);
        notifyUserIds.push(...jefesDepto);

        this.eventBus.emit({
          type: AppEventType.EVALUATION_ASSIGNED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            preliminaryDraftId: preliminaryDraftId,
            veredict: evaluation.veredict,
            preliminaryDraftTitle: currentDraftTitle // 💡 Título inyectado con éxito
          }
        });
      })
    );
  }

  /**
   * Añade un nuevo documento (Versión inicial o Corrección) al historial.
   * Dependiendo del tipo de documento, enruta las notificaciones a los actores correspondientes.
   */
  uploadDocumentMock(preliminaryDraftId: string, document: Document): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        const renewedDeadLine = addBusinessDays(new Date(), 10);
        let currentDraftTitle = '';
        const notifyUserIds: string[] = [];

        this.storage.updateDraft(preliminaryDraftId, (preliminaryDraft) => {
          const proposal = preliminaryDraft.proposalData;

          if (proposal) {
            currentDraftTitle = proposal.title || '';
          }

          // 💡 ENRUTAMIENTO ATÓMICO SEGURO: Evaluamos las condiciones basándonos en el estado inmutable real
          if (document.type === 'Correccion') {
            if (preliminaryDraft.evaluators) {
              notifyUserIds.push(...preliminaryDraft.evaluators.map(evaluator => evaluator.id));
            }
            if (proposal?.director?.id) {
              notifyUserIds.push(proposal.director.id);
            }

          } else if (document.type === DocumentType.FORMATO_C) {
            if (proposal) {
              proposal.authors?.forEach(author => {
                if (typeof author === 'string') notifyUserIds.push(author);
                else if (author?.id) notifyUserIds.push(author.id);
              });

              if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
              if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
              if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);
            }

          } else {
            if (proposal?.authors) {
              proposal.authors.forEach(author => {
                if (typeof author === 'string') notifyUserIds.push(author);
                else if (author?.id) notifyUserIds.push(author.id);
              });
            }
          }

          return {
            ...preliminaryDraft,
            documents: [document, ...(preliminaryDraft.documents || [])],
            state: stateList.EN_REVISION,
            evaluationDeadline: renewedDeadLine,
          };
        });

        // Roles institucionales agregados fuera de la mutación de datos del anteproyecto
        if (document.type === DocumentType.FORMATO_C) {
          const jefesYConsejo = this.userService.users()
            .filter(user => user.roles.includes(UserRoleType.JEFE_DEP) || user.roles.includes(UserRoleType.CONSEJO))
            .map(user => user.id);

          notifyUserIds.push(...jefesYConsejo);
        }

        this.eventBus.emit({
          type: AppEventType.DOCUMENT_CORRECTION_UPLOADED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            preliminaryDraftId: preliminaryDraftId,
            documentType: document.type,
            preliminaryDraftTitle: currentDraftTitle // 💡 Título inyectado con éxito
          }
        });
      })
    );
  }

  /**
   * Sube el acta/formato final de resolución emitido por el consejo de facultad.
   * Modificado para garantizar la consistencia atómica mediante variables puente locales.
   */
  uploadCouncilResolutionMock(
    id: string,
    document: Document,
    state: stateList,
    evaluation: Evaluation,
    maximumDeliveryDate?: Date | string
  ): Observable<PreliminaryDraft | undefined> {
    return of(undefined).pipe(
      delay(1000),
      map(() => {
        let updatedDraftRef: PreliminaryDraft | undefined = undefined;
        let currentDraftTitle = '';
        const notifyUserIds: string[] = [];

        this.storage.updateDraft(id, (preliminaryDraft) => {
          currentDraftTitle = preliminaryDraft.proposalData?.title || '';

          const updated: PreliminaryDraft = {
            ...preliminaryDraft,
            documents: [...(preliminaryDraft.documents || []), document],
            state: state,
            evaluations: [...(preliminaryDraft.evaluations || []), evaluation],
            maximumDeliveryDate: state === stateList.APROBADO ? maximumDeliveryDate : preliminaryDraft.maximumDeliveryDate
          };

          // Guardamos referencia al nuevo objeto construido para retornarlo al flujo asíncrono
          updatedDraftRef = updated;

          // 💡 Extracción segura de los destinatarios dentro de la misma transacción de estado
          if (updated.proposalData?.authors) {
            updated.proposalData.authors.forEach(author => {
              if (typeof author === 'string') notifyUserIds.push(author);
              else if (author?.id) notifyUserIds.push(author.id);
            });
          }
          if (updated.proposalData?.director?.id) notifyUserIds.push(updated.proposalData.director.id);
          if (updated.proposalData?.codirector?.id) notifyUserIds.push(updated.proposalData.codirector.id);
          if (updated.proposalData?.advisor?.id) notifyUserIds.push(updated.proposalData.advisor.id);
          if (updated.evaluators) notifyUserIds.push(...updated.evaluators.map(evaluator => evaluator.id));

          return updated;
        });

        if (updatedDraftRef) {
          this.eventBus.emit({
            type: AppEventType.COUNCIL_RESOLUTION_UPLOADED,
            targetUserIds: [...new Set(notifyUserIds)],
            payload: {
              preliminaryDraftId: id,
              finalState: state,
              preliminaryDraftTitle: currentDraftTitle // 💡 Título inyectado con éxito
            }
          });
        }

        return updatedDraftRef;
      })
    );
  }

  /**
   * Calcula el estado visual detallado de un documento específico esperando a todos los jurados.
   */
  /**
   * Calcula el estado visual detallado de un documento específico esperando a todos los jurados.
   */
  calculateDocumentStatus(documentId: string, evaluations: Evaluation[], totalEvaluators: number): stateList {
    // 👇 NUEVA VALIDACIÓN: Si aún no hay evaluadores asignados, el documento sigue en revisión.
    if (totalEvaluators === 0) {
      return stateList.EN_REVISION;
    }

    const documentEvaluations = evaluations?.filter(evaluation => evaluation.documentId === documentId) || [];

    if (documentEvaluations.length < totalEvaluators) {
      return stateList.EN_REVISION;
    }

    if (documentEvaluations.some(evaluation => evaluation.veredict === stateList.NO_APROBADO)) {
      return stateList.NO_APROBADO;
    }

    return stateList.APROBADO;
  }
}
