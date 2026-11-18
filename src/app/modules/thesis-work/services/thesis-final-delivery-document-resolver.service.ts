import { Injectable } from '@angular/core';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';

/** Documentos de la solicitud de sustentación que se resuelven. */
export type FinalDeliveryDocType = 'MONOGRAFIA' | 'FORMATO_E' | 'ANEXOS';

/** Encuentra los documentos vigentes de la solicitud de sustentación y del paz y salvo. */
@Injectable({ providedIn: 'root' })
export class ThesisFinalDeliveryDocumentResolverService {
  /** Documento del tipo indicado de la solicitud vigente, que va primero; no se ordena por fecha porque una nueva solicitud puede tener la misma fecha que la anterior. */
  resolveLatestFinalDeliveryDocument(
    thesisWork: ThesisWork | null | undefined,
    type: FinalDeliveryDocType
  ): FileDocument | null {
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

  /** Formato F de la revisión más reciente de Decanatura (las revisiones vienen de la más reciente a la más antigua). */
  resolveLatestPazYSalvoDocument(thesisWork: ThesisWork | null | undefined): FileDocument | null {
    return thesisWork?.pazYSalvos?.[0]?.document ?? null;
  }
}
