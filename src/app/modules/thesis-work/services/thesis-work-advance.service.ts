import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { Document, DocumentType } from '../../../core/interfaces/Document.interface';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkAdvanceService {
  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Carga múltiples archivos y los asocia a un avance (nuevo o existente)
   */
  uploadDocumentMock(thesisWorkId: string, document: Document, advanceMeta?: CreateAdvanceRequest): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {

          // Si no es un documento de tipo avance, va al repositorio global
          if ((document.type as string) !== DocumentType.AVANCE) {
            const nextState = document.type === 'Formato' ? stateList.EN_REVISION : work.state;
            return {
              ...work,
              documents: [document, ...work.documents],
              state: nextState
            };
          }

          // 🚀 CAMBIO CLAVE: El ID del avance viene en la meta, si no existe (retrocompatibilidad) cae al del documento
          const targetAdvanceId = advanceMeta?.advanceId || document.id;

          const existingAdvances = work.advances || [];
          const advanceExists = existingAdvances.some(adv => adv.id === targetAdvanceId);

          let updatedAdvances;

          if (advanceExists) {
            // Si el bloque de avance ya existe, le agregamos el nuevo archivo adjunto (que tiene su propio ID único)
            updatedAdvances = existingAdvances.map(adv => {
              if (adv.id !== targetAdvanceId) return adv;
              return {
                ...adv,
                documents: [...adv.documents, document]
              };
            });
          } else {
            // Si es el primer archivo de este lote, creamos la entidad Advance usando targetAdvanceId
            const newAdvance = {
              id: targetAdvanceId, // ID del grupo/bloque
              title: advanceMeta?.title || document.name,
              comments: advanceMeta?.comments || '',
              uploadDate: new Date(document.uploadDate),
              studentId: advanceMeta?.studentId || '',
              status: stateList.EN_REVISION,
              documents: [document] // Primer documento con su ID único
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
