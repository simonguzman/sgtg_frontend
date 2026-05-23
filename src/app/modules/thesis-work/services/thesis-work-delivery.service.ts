import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

import { ThesisWorkStorageService } from './thesis-work-storage.service';

import { stateList } from '../../../core/enums/state.enum';

import {
  Document,
  DocumentType
} from '../../../core/interfaces/Document.interface';
import { FinalDelivery } from '../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkDeliveryService {

  private readonly storage = inject(ThesisWorkStorageService);

  /**
   * Entrega final del trabajo de grado:
   * - Monografía
   * - Formato_E
   * - Anexos
   */
  uploadFinalDeliveryMock(thesisWorkId: string, monograph: File, formatE: File, annexes?: File ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          const dateStr = new Date()
            .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replaceAll('/', ' - ');

          const docMonograph: Document = {
            id: crypto.randomUUID(),
            name: monograph.name.replace('.pdf', ''),
            url: 'uploads/final-delivery/monografia_' + monograph.name,
            uploadDate: dateStr,
            type: DocumentType.MONOGRAFIA,
            status: stateList.EN_REVISION
          };

          const docFormatE: Document = {
            id: crypto.randomUUID(),
            name: formatE.name.replace('.pdf', ''),
            url: 'uploads/final-delivery/formato_e_' + formatE.name,
            uploadDate: dateStr,
            type: DocumentType.FORMATO_E,
            status: stateList.EN_REVISION
          };

          let docAnnexes: Document | undefined;
          if (annexes) {
            docAnnexes = {
              id: crypto.randomUUID(),
              name: annexes.name,
              url: 'uploads/final-delivery/anexos_' + annexes.name,
              uploadDate: dateStr,
              type: DocumentType.ANEXOS,
              status: stateList.EN_REVISION
            };
          }

          // 📦 Empaquetamos la entrega completa
          const newDelivery: FinalDelivery = {
            id: crypto.randomUUID(), // ID único del contenedor
            uploadDate: dateStr,
            monograph: docMonograph,
            formatE: docFormatE,
            annexes: docAnnexes,
            status: stateList.EN_REVISION
          };

          return {
            ...work,
            finalDeliveries: [
              newDelivery,
              ...(work.finalDeliveries || [])
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
  registerPazYSalvoMock( thesisWorkId: string, payload: PazYSalvoPayload, file: File ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateWork(thesisWorkId, (work) => {
          const isFullyApproved = payload.academicApproved && payload.financialApproved;
          const dateStr = new Date()
            .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replaceAll('/', ' - ');

          // 1. Construimos el documento del Paz y Salvo
          const pazYSalvoDoc: Document = {
            id: crypto.randomUUID(),
            name: file.name.replace('.pdf', ''),
            url: 'uploads/paz-y-salvo/' + file.name,
            uploadDate: dateStr,
            type: DocumentType['PAZ_Y_SALVO'],
            status: isFullyApproved ? stateList.APROBADO : stateList.NO_APROBADO
          };

          // 2. Mantenemos la actualización en la lista general por si acaso
          let updatedDocuments = [
            pazYSalvoDoc,
            ...(work.documents || [])
          ];

          // 3. 🚀 NUEVA LÓGICA: Si falla la aprobación, invalidamos la entrega final activa
          let updatedDeliveries = work.finalDeliveries || [];
          if (!isFullyApproved && updatedDeliveries.length > 0) {
            // Mapeamos las entregas, cambiando el estado de la última (la más reciente) a NO_APROBADO
            updatedDeliveries = updatedDeliveries.map((delivery, index) => {
              if (index === 0) { // Asumiendo que las manejas en orden descendente [0] es la última
                return {
                  ...delivery,
                  status: stateList.NO_APROBADO,
                  // Opcional: Si quieres invalidar también los sub-documentos internos para consistencia visual
                  monograph: { ...delivery.monograph, status: stateList.NO_APROBADO },
                  formatE: { ...delivery.formatE, status: stateList.NO_APROBADO }
                };
              }
              return delivery;
            });
          }

          return {
            ...work,
            pazYSalvos: [ // 👈 Cambio: Ahora construimos el historial de registros
              {
                id: crypto.randomUUID(),
                academicApproved: payload.academicApproved,
                academicComments: payload.academicComments,
                financialApproved: payload.financialApproved,
                financialComments: payload.financialComments,
                document: pazYSalvoDoc,
                registrationDate: new Date()
              },
              ...(work.pazYSalvos || [])
            ],
            documents: updatedDocuments,
            finalDeliveries: updatedDeliveries,
            state: isFullyApproved ? work.state : stateList.NO_APROBADO
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
