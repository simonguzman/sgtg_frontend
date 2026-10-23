import { Injectable } from '@angular/core';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentTableRow } from '../models/loaded-proposals-page.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { formatDisplayDate } from '../../../../../core/utils/date-utils';

@Injectable({ providedIn: 'root' })
export class LoadedProposalsMapperService {

  /**
   * Fila de un registro: la versión del formato A (con su número y el estado de
   * su revisión) y los documentos radicados con ella. Siempre se pueden ver los
   * detalles; solo la versión En revisión se puede evaluar.
   *
   * @param principal versión del formato A (o, si no hay, el primer documento)
   * @param adjuntos  otros documentos del registro (carta de aceptación)
   */
  public mapRegistrationToRow(
    principal: FileDocument,
    adjuntos: FileDocument[],
    esVersion: boolean,
    canEvaluate: boolean,
    isArchived: boolean
  ): DocumentTableRow {
    const allowed: string[] = ['view-details'];
    if (esVersion && canEvaluate && principal.status === stateList.EN_REVISION && !isArchived) {
      allowed.push('evaluate');
    }
    return {
      id: principal.id,
      name: [principal.name, ...adjuntos.map(adjunto => minusculaInicial(adjunto.name))].join(' y '),
      // La tabla muestra el texto tal cual: la fecha se formatea (DD - MM - AAAA)
      uploadDate: principal.uploadDate instanceof Date ? formatDisplayDate(principal.uploadDate) : principal.uploadDate,
      version: esVersion ? principal.version : undefined,
      status: esVersion ? principal.status : undefined,
      documents: [principal, ...adjuntos],
      allowedActions: allowed
    };
  }
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLocaleLowerCase('es') + texto.slice(1);
}
