import { Injectable } from '@angular/core';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

@Injectable()
export class LoadedDocumentsPreliminaryDraftMapperService {

  formatDate(date: Date): string {
    return date
      .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replaceAll('/', ' - ');
  }

  buildNewDocumentRecord(
    fileName: string,
    uploadType: DocumentType
  ): FileDocument {
    return {
      id: crypto.randomUUID(),
      name: fileName.replace('.pdf', ''),
      url: '',
      uploadDate: this.formatDate(new Date()),
      type: uploadType,
      status: stateList.EN_REVISION
    };
  }

  getEmptyMessage(activeTab: string): string {
    return activeTab === 'ANTEPROYECTOS'
      ? 'No han sido registrados documentos de anteproyecto en el sistema'
      : 'No hay presentaciones registradas para este anteproyecto';
  }

  getUploadModalDescription(activeTab: string): string {
    return activeTab === 'ANTEPROYECTOS'
      ? 'Seleccione el archivo PDF del anteproyecto'
      : 'Seleccione el archivo PDF de la presentación';
  }

  getUploadModalUserRole(activeTab: string): string {
    return activeTab === 'ANTEPROYECTOS' ? 'Estudiante' : 'Jefe de Departamento';
  }

  getConfirmModalDescription(activeTab: string): string {
    return activeTab === 'ANTEPROYECTOS'
      ? "¿Está seguro de cargar este anteproyecto? El estado cambiará a 'En revisión'."
      : '¿Está seguro de cargar esta presentación al consejo?';
  }
}
