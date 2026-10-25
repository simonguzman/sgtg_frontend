import { Injectable } from '@angular/core';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';

export type FinalDeliveryDocType = 'MONOGRAFIA' | 'FORMATO_E' | 'ANEXOS';

@Injectable({ providedIn: 'root' })
export class ThesisFinalDeliveryDocumentResolverService {

  resolveLatestFinalDeliveryDocument(
    thesisWork: ThesisWork | null | undefined,
    type: FinalDeliveryDocType
  ): FileDocument | null {
    // La solicitud vigente va primero (las anteriores, cuyo paz y salvo no se aprobó, después). No se
    // ordena por fecha: una nueva solicitud puede tener la misma fecha que la anterior
    const latest = thesisWork?.finalDeliveries?.[0];
    if (!latest) return null;

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
    // Las revisiones de Decanatura vienen de la más reciente a la más antigua
    return thesisWork?.pazYSalvos?.[0]?.document ?? null;
  }
}
