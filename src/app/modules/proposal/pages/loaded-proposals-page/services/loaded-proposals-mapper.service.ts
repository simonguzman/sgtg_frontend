import { Injectable } from '@angular/core';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentTableRow } from '../models/loaded-proposals-page.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { formatDisplayDate } from '../../../../../core/utils/date-utils';

@Injectable({ providedIn: 'root' })
export class LoadedProposalsMapperService {

  /**
   * Fila de la tabla: las versiones del formato A muestran su número y el estado
   * de su revisión; solo la versión En revisión se puede evaluar.
   */
  public mapDocumentToRow(
    document: FileDocument,
    canEvaluate: boolean,
    isArchived: boolean
  ): DocumentTableRow {
    const allowed: string[] = ['download'];
    if (canEvaluate && document.status === stateList.EN_REVISION && !isArchived) {
      allowed.push('evaluate');
    }
    const esVersion = document.type === DocumentType.PROPUESTA || document.type === DocumentType.CORRECCION;
    return {
      ...document,
      // La tabla muestra el texto tal cual: la fecha se formatea (DD - MM - AAAA)
      uploadDate: document.uploadDate instanceof Date ? formatDisplayDate(document.uploadDate) : document.uploadDate,
      version: esVersion ? document.version : undefined,
      status: esVersion ? document.status : undefined,
      allowedActions: allowed
    };
  }
}
