import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ProposalStorageService } from './proposal-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Document } from '../../../core/interfaces/Document.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({
  providedIn: 'root'
})
export class ProposalDocumentService {
  private readonly storage = inject(ProposalStorageService);

  /**
   * Añade una evaluación realizada por el comité y refresca el estado general del documento/propuesta
   */
  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateProposals(list => list.map(p => {
          if (p.id !== proposalId) return p;

          const updatedProposal = {
            ...p,
            state: evaluation.veredict,
            evaluations: [
              { ...evaluation, id: Math.random().toString(36).substring(2, 7) },
              ...(p.evaluations || [])
            ]
          };

          if (updatedProposal.documents?.length > 0) {
            updatedProposal.documents = updatedProposal.documents.map((doc, index) =>
              index === 0 ? { ...doc, status: evaluation.veredict } : doc
            );
          }
          return updatedProposal;
        }));
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
        this.storage.updateProposals(list =>
          list.map(p => p.id === proposalId
            ? { ...p, documents: [newDoc, ...(p.documents || [])], state: stateList.EN_REVISION }
            : p
          )
        );
      })
    );
  }
}
