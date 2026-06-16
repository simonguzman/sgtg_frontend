import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ProposalStorageService } from './proposal-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Document } from '../../../core/interfaces/Document.interface';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays } from '../../../core/utils/date-utils';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class ProposalDocumentService {
  private readonly storage = inject(ProposalStorageService);

  private readonly eventBus = inject(EventBusService);
  /**
   * Añade una evaluación realizada por el comité y refresca el estado general del documento/propuesta
   */
  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateProposals(list => list.map(proposal => {
          if (proposal.id !== proposalId) return proposal;

          // Si la fecha actual supera el deadline, se marca como retrasada
          const evaluatedLate = proposal.evaluationDeadline
            ? new Date() > new Date(proposal.evaluationDeadline)
            : false;

          const updatedProposal = {
            ...proposal,
            state: evaluation.veredict,
            evaluations: [
              {
                ...evaluation,
                id: Math.random().toString(36).substring(2, 7),
                date: new Date(),
                isDelayed: evaluatedLate // <--- Registrado para tus estadísticas futuras
              },
              ...(proposal.evaluations || [])
            ]
          };

          if (updatedProposal.documents?.length > 0) {
            updatedProposal.documents = updatedProposal.documents.map((doc, index) =>
              index === 0 ? { ...doc, status: evaluation.veredict } : doc
            );
          }
          return updatedProposal;
        }));
        this.eventBus.emit({
          type: AppEventType.EVALUATION_ASSIGNED,
          payload: { proposalId, veredict: evaluation.veredict }
        });
      })
    );
  }

  /**
   * Carga una nueva corrección (Documento) a la propuesta regresando el estado a REVISIÓN
   */
  uploadCorrectionMock(proposalId: string, newDoc: Document): Observable<void> {
    return of(undefined).pipe(
      delay(1200),
      tap(() => {
        const now = new Date();
        const newDeadline = addBusinessDays(now, 10); // <--- Reiniciamos el reloj (10 días hábiles)

        this.storage.updateProposals(list =>
          list.map(proposal => proposal.id === proposalId
            ? {
                ...proposal,
                documents: [newDoc, ...(proposal.documents || [])],
                state: stateList.EN_REVISION,
                evaluationDeadline: newDeadline // <--- Asignamos el nuevo plazo
              }
            : proposal
          )
        );
      })
    );
  }
}
