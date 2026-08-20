import { Injectable } from '@angular/core';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { parseDisplayDate } from '../../../core/utils/date-utils';

export type FinalDeliveryDocType = 'MONOGRAFIA' | 'FORMATO_E' | 'ANEXOS';

@Injectable({ providedIn: 'root' })
export class ThesisFinalDeliveryDocumentResolverService {

  resolveLatestFinalDeliveryDocument(
    thesisWork: ThesisWork | null | undefined,
    type: FinalDeliveryDocType
  ): FileDocument | null {
    if (!thesisWork?.finalDeliveries?.length) return null;

    // Se copia el array para evitar mutar el estado original del objeto ThesisWork
    const latestDeliveries = [...thesisWork.finalDeliveries].sort((a, b) => {
      const timeA = parseDisplayDate(a.uploadDate)?.getTime() || 0;
      const timeB = parseDisplayDate(b.uploadDate)?.getTime() || 0;
      return timeB - timeA;
    });

    const latest = latestDeliveries[0];

    switch (type) {
      case 'MONOGRAFIA':
        return latest?.monograph ?? null;
      case 'FORMATO_E':
        return latest?.formatE ?? null;
      case 'ANEXOS':
        return latest?.annexes ?? null;
      default:
        return null;
    }
  }

  resolveLatestPazYSalvoDocument(thesisWork: ThesisWork | null | undefined): FileDocument | null {
    if (!thesisWork?.pazYSalvos?.length) return null;

    // Se asume que registrationDate es compatible con new Date()
    const latestPazYSalvos = [...thesisWork.pazYSalvos].sort((a, b) => {
      const timeA = new Date(a.registrationDate).getTime() || 0;
      const timeB = new Date(b.registrationDate).getTime() || 0;
      return timeB - timeA;
    });

    return latestPazYSalvos[0]?.document ?? null;
  }
}
