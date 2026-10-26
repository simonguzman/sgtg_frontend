import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';

/** Versiones del anteproyecto (sin resoluciones ni otros documentos), de la más reciente a la más antigua. */
export function versionesDelAnteproyecto(documents: FileDocument[] | null | undefined): FileDocument[] {
  return (documents ?? [])
    .filter(document => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
}

/** Versión vigente del anteproyecto, null si no se ha radicado ninguna. */
export function versionVigente(preliminaryDraft: Pick<PreliminaryDraft, 'documents'> | null | undefined): FileDocument | null {
  return versionesDelAnteproyecto(preliminaryDraft?.documents)[0] ?? null;
}

/**
 * El director radica una nueva versión solo si la vigente no se aprobó: un
 * evaluador pidió correcciones o el Consejo no la aprobó (regla del backend).
 */
export function anteproyectoCorregible(preliminaryDraft: Pick<PreliminaryDraft, 'documents'> | null | undefined): boolean {
  const estado = versionVigente(preliminaryDraft)?.status;
  return estado === stateList.NO_APROBADO;
}
