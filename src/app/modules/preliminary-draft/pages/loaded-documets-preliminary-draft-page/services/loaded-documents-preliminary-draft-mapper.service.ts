import { Injectable } from '@angular/core';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { formatDisplayDate } from '../../../../../core/utils/date-utils';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';
import { LoadedDocumentsTabType } from '../models/loaded-documents-preliminary-draft-page.model';

@Injectable()
export class LoadedDocumentsPreliminaryDraftMapperService {
  async buildNewDocumentRecord(
    fileName: string,
    file: File,
    uploadType: DocumentType
  ): Promise<FileDocument> {
    const fileUrl = await readFileAsDataUrl(file);
    return {
      id: crypto.randomUUID(),
      name: fileName.replace('.pdf', ''),
      url: fileUrl,
      uploadDate: formatDisplayDate(new Date()),
      type: uploadType,
      status: stateList.EN_REVISION
    };
  }

  getEmptyMessage(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS
      ? 'No han sido registrados documentos de anteproyecto en el sistema'
      : 'No hay presentaciones registradas para este anteproyecto';
  }

  getUploadModalDescription(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS
      ? 'Seleccione el archivo PDF del anteproyecto'
      : 'Seleccione el archivo PDF de la presentación';
  }

  getUploadModalUserRole(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS ? 'Estudiante' : 'Jefe de Departamento';
  }

  getConfirmModalDescription(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS
      ? "¿Está seguro de cargar este anteproyecto? El estado cambiará a 'En revisión'."
      : '¿Está seguro de cargar esta presentación al consejo?';
  }
}
