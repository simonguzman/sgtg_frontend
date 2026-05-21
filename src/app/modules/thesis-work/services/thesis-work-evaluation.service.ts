import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkEvaluationService {
  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Guarda la evaluación de un avance y actualiza el estado del avance afectado
   */
  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {

          // 🛠️ FIX BUG 1: Mapeamos los avances para encontrar el afectado y actualizar su status interno
          const updatedAdvances = (work.advances || []).map(adv => {
            if (adv.id !== evaluation.documentId) return adv; // El documentId de la evaluación apunta al ID del avance
            return {
              ...adv,
              status: evaluation.veredict // Cambia el estado a EVALUADO o EN_REVISION (Requiere Correcciones)
            };
          });

          return {
            ...work,
            advances: updatedAdvances,
            evaluations: [evaluation, ...(work.evaluations || [])]
          };
        });
      })
    );
  }
}
