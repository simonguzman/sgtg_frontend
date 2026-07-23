import { Injectable } from '@angular/core';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentTableRow } from '../models/loaded-proposals-page.model';
import { stateList } from '../../../../../core/enums/state.enum';

@Injectable({ providedIn: 'root' })
export class LoadedProposalsMapperService {

  public mapDocumentToRow(
    document: FileDocument,
    canEvaluate: boolean,
    isArchived: boolean
  ): DocumentTableRow {
    const allowed: string[] = ['download'];
    if (canEvaluate && document.status === stateList.EN_REVISION && !isArchived) {
      allowed.push('evaluate');
    }
    return { ...document, allowedActions: allowed };
  }
}
