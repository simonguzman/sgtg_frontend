import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { Document } from '../../../core/interfaces/Document.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkAdvanceService {
  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Carga múltiples archivos y los asocia a un avance (nuevo o existente)
   */
  uploadDocumentMock(
    thesisWorkId: string,
    document: Document,
    advanceMeta?: { title: string; comments: string; studentId: string }
  ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        // Delegamos la mutación al storage central
        this.storage.updateWork(thesisWorkId, (work) => {

          // Si no es un documento de tipo avance, va al repositorio global
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
            // Si el bloque de avance ya existe, le agregamos el nuevo archivo adjunto
            updatedAdvances = existingAdvances.map(adv => {
              if (adv.id !== document.id) return adv;
              return {
                ...adv,
                documents: [...adv.documents, document]
              };
            });
          } else {
            // Si es el primer archivo de este lote/bloque, creamos la entidad Advance
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
            advances: updatedAdvances
          };
        });
      })
    );
  }
}
