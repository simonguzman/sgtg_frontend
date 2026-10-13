import { Injectable } from '@angular/core';
import { LoadedDocumentsTabType } from '../models/loaded-documents-preliminary-draft-page.model';

@Injectable()
export class LoadedDocumentsPreliminaryDraftMapperService {
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
