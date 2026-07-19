import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ProposalStorageService } from './proposal-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays, getRemainingBusinessDays } from '../../../core/utils/date-utils';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

@Injectable({
  providedIn: 'root'
})
export class ProposalDocumentService {
  private readonly storage = inject(ProposalStorageService);
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);

  /**
   * Añade una evaluación realizada por el comité y refresca el estado general del documento/propuesta
   */
  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let proposalTitle = '';
        const notifyUserIds: string[] = [];

        // 💡 Transacción síncrona y atómica sobre la lista de señales
        this.storage.updateProposals(list => list.map(proposal => {
          if (proposal.id !== proposalId) return proposal;

          // 🔒 Captura segura de datos dentro del ciclo inmutable
          proposalTitle = proposal.title || '';

          // Extracción de autores (estudiantes) vinculados de forma directa
          proposal.authors?.forEach(author => {
            if (author?.id) notifyUserIds.push(author.id);
          });

          // Extracción del equipo de docentes asignados
          if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
          if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);

          // 1. Calculamos los días hábiles restantes
          const remainingDays = proposal.evaluationDeadline
            ? getRemainingBusinessDays(proposal.evaluationDeadline)
            : 0;

          // 2. Determinamos el estado histórico de la evaluación
          const timelinessStatus = remainingDays < 0
            ? EvaluationDeadlineStatus.DELAYED
            : EvaluationDeadlineStatus.ON_TIME;

          const updatedProposal = {
            ...proposal,
            state: evaluation.veredict,
            evaluations: [
              {
                ...evaluation,
                id: Math.random().toString(36).substring(2, 7),
                date: new Date(),
                deadlineStatus: timelinessStatus // ✅ Guardamos el Enum como registro histórico
              },
              ...(proposal.evaluations || [])
            ]
          };

          if (updatedProposal.documents && updatedProposal.documents.length > 0) {
            updatedProposal.documents = updatedProposal.documents.map((doc, index) =>
              index === 0 ? { ...doc, status: evaluation.veredict } : doc
            );
          }
          return updatedProposal;
        }));

        // Emisión con payload enriquecido y estandarizado
        this.eventBus.emit({
          type: AppEventType.EVALUATION_ASSIGNED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            proposalId,
            veredict: evaluation.veredict,
            proposalTitle: proposalTitle
          }
        });
      })
    );
  }

  /**
   * Carga una nueva corrección (Documento) a la propuesta regresando el estado a REVISIÓN
   */
  uploadCorrectionMock(proposalId: string, newDoc: FileDocument): Observable<void> {
    return of(undefined).pipe(
      delay(1200),
      tap(() => {
        const now = new Date();
        const newDeadline = addBusinessDays(now, 10);

        let proposalTitle = '';
        const notifyUserIds: string[] = [];

        this.storage.updateProposals(list =>
          list.map(proposal => {
            if (proposal.id !== proposalId) return proposal;

            proposalTitle = proposal.title || '';

            proposal.authors?.forEach(author => {
              if (author?.id) notifyUserIds.push(author.id);
            });
            if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
            if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
            if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);

            return {
              ...proposal,
              documents: [newDoc, ...(proposal.documents || [])],
              state: stateList.EN_REVISION,
              evaluationDeadline: newDeadline
            };
          })
        );

        const comiteUsers = this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.COMITE))
          .map(user => user.id);
        notifyUserIds.push(...comiteUsers);

        this.eventBus.emit({
          type: AppEventType.PROPOSAL_CORRECTION_UPLOADED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            proposalId: proposalId,
            proposalTitle: proposalTitle
          }
        });
      })
    );
  }
}
