import { Injectable } from '@angular/core';
import { LoadedDocumentsTabType } from '../models/loaded-documents-preliminary-draft-page.model';

/** Textos de la página de documentos cargados según la pestaña. */
@Injectable()
export class LoadedDocumentsPreliminaryDraftMapperService {
  /** Mensaje de la pestaña sin documentos. */
  getEmptyMessage(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS
      ? 'No han sido registrados documentos de anteproyecto en el sistema'
      : 'No hay presentaciones registradas para este anteproyecto';
  }

  /** Texto del modal de carga. */
  getUploadModalDescription(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS
      ? 'Seleccione el archivo PDF del anteproyecto'
      : 'Seleccione el archivo PDF de la presentación';
  }

  /** Rol que carga el documento. */
  getUploadModalUserRole(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS ? 'Estudiante' : 'Jefe de Departamento';
  }

  /** Texto de la confirmación de la carga. */
  getConfirmModalDescription(activeTab: string): string {
    return activeTab === LoadedDocumentsTabType.ANTEPROYECTOS
      ? "¿Está seguro de cargar este anteproyecto? El estado cambiará a 'En revisión'."
      : '¿Está seguro de remitir el anteproyecto al Consejo de Facultad con este formato C?';
  }
}
