import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

import { ThesisWorkStorageService } from './thesis-work-storage.service';

import { stateList } from '../../../core/enums/state.enum';

import {
  Document,
  DocumentType
} from '../../../core/interfaces/Document.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkDeliveryService {

  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Entrega final del trabajo de grado:
   * - Monografía
   * - Formato E
   * - Anexos
   */
  uploadFinalDeliveryMock(thesisWorkId: string, monograph: File, formatE: File, annexes?: File ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          const dateStr = new Date()
            .toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
            .replaceAll('/', ' - ');
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
          const newDocuments: Document[] = [
            docMonograph,
            docFormatE
          ];
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
            documents: [
              ...newDocuments,
              ...(work.documents || [])
            ],
            state: stateList.EN_REVISION
          };
        });
      })
    );
  }

  /**
   * Registro de Paz y Salvo académico/financiero
   */
  registerPazYSalvoMock(
    thesisWorkId: string,
    payload: {
      academicApproved: boolean;
      academicComments?: string;
      financialApproved: boolean;
      financialComments?: string;
    },
    file: File
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          const isFullyApproved =
            payload.academicApproved &&
            payload.financialApproved;
          const dateStr = new Date()
            .toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
            .replaceAll('/', ' - ');
          const docId = crypto.randomUUID();
          const pazYSalvoDoc: Document = {
            id: docId,
            name: file.name.replace('.pdf', ''),
            url: 'uploads/paz-y-salvo/' + file.name,
            uploadDate: dateStr,
            type: DocumentType['PAZ Y SALVO'],
            status: isFullyApproved
              ? stateList.APROBADO
              : stateList.NO_APROBADO
          };
          let updatedDocuments = [
            pazYSalvoDoc,
            ...(work.documents || [])
          ];
          // Si no fue aprobado completamente,
          // invalidamos el Formato E
          if (!isFullyApproved) {
            updatedDocuments = updatedDocuments.map(doc => {
              if (doc.type === DocumentType['FORMATO E']) {
                return {
                  ...doc,
                  status: stateList.NO_APROBADO
                };
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
        });
      })
    );
  }

  /**
   * Subida de documentos corregidos después de observaciones
   */
  uploadCorrectedDocumentsMock( thesisWorkId: string, monograph: File, annexes?: File ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          const dateStr = new Date()
            .toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
            .replaceAll('/', ' - ');
          const docMonograph: Document = {
            id: crypto.randomUUID(),
            name: monograph.name.replace('.pdf', ''),
            url: 'uploads/corrected-documents/' + monograph.name,
            uploadDate: dateStr,
            type: DocumentType.CORRECCION,
            status: stateList.EN_REVISION
          };
          const newDocuments: Document[] = [docMonograph];
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
            documents: [
              ...newDocuments,
              ...(work.documents || [])
            ],
            state: stateList.EN_REVISION
          };
        });
      })
    );
  }

  /**
   * Registro de documento de correspondencia final
   */
  registerCorrespondenceDocumentMock( thesisWorkId: string, document: Document ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          return {
            ...work,
            documents: [
              document,
              ...(work.documents || [])
            ],
            state: stateList.APROBADO
          };
        });
      })
    );
  }
}
