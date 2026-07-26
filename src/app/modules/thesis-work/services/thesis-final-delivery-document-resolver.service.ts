import { Injectable } from '@angular/core';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';

/**
 * Centraliza la resolución del documento vigente de entrega final y de paz y salvo.
 * Antes esta lógica (con sus mismos "FIX Bug" de ordenamiento por fecha) estaba
 * duplicada en RegisterSustentationFormComponent y EvaluateSustentationFormComponent —
 * cualquier corrección futura tenía que aplicarse dos veces. Ahora vive en un solo lugar.
 */
@Injectable({ providedIn: 'root' })
export class ThesisFinalDeliveryDocumentResolverService {

  resolveLatestFinalDeliveryDocument(
    thesis: ThesisWork,
    type: 'MONOGRAFIA' | 'FORMATO_E' | 'ANEXOS'
  ): FileDocument | null {
    if (!thesis?.finalDeliveries?.length) return null;

    const latest = [...thesis.finalDeliveries].sort((a, b) =>
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    )[0];

    if (type === 'MONOGRAFIA') return latest?.monograph ?? null;
    if (type === 'FORMATO_E')  return latest?.formatE ?? null;
    if (type === 'ANEXOS')     return latest?.annexes ?? null;
    return null;
  }

  resolveLatestPazYSalvoDocument(thesis: ThesisWork): FileDocument | null {
    if (!thesis?.pazYSalvos?.length) return null;

    const latest = [...thesis.pazYSalvos].sort((a, b) =>
      new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
    )[0];

    return latest?.document ?? null;
  }
}
