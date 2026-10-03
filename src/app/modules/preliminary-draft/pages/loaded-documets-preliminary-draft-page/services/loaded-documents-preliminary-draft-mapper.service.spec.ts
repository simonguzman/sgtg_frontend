import { TestBed } from '@angular/core/testing';
import { LoadedDocumentsPreliminaryDraftMapperService } from './loaded-documents-preliminary-draft-mapper.service';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { LoadedDocumentsTabType } from '../models/loaded-documents-preliminary-draft-page.model';

import * as fileReaderUtils from '../../../../../core/utils/file-reader.utils';
import * as dateUtils from '../../../../../core/utils/date-utils';

describe('LoadedDocumentsPreliminaryDraftMapperService', () => {
  let service: LoadedDocumentsPreliminaryDraftMapperService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [LoadedDocumentsPreliminaryDraftMapperService]
    });
    service = TestBed.inject(LoadedDocumentsPreliminaryDraftMapperService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('buildNewDocumentRecord', () => {
    it('debería construir un nuevo registro de documento correctamente de forma asíncrona', async () => {
      const fileName = 'mi_documento.pdf';
      const mockFile = new File(['contenido falso'], fileName, { type: 'application/pdf' });
      const uploadType = DocumentType.ANTEPROYECTO;

      const mockDataUrl = 'data:application/pdf;base64,dummy_data';
      const mockDate = '08/08/2026';

      const readFileSpy = jest.spyOn(fileReaderUtils, 'readFileAsDataUrl').mockResolvedValue(mockDataUrl);
      const dateSpy = jest.spyOn(dateUtils, 'formatDisplayDate').mockReturnValue(mockDate);

      const result = await service.buildNewDocumentRecord(fileName, mockFile, uploadType);

      expect(readFileSpy).toHaveBeenCalledWith(mockFile);
      expect(dateSpy).toHaveBeenCalled();

      expect(result.id).toEqual(expect.any(String));
      expect(result.name).toBe('mi_documento');
      expect(result.url).toBe(mockDataUrl);
      expect(result.uploadDate).toBe(mockDate);
      expect(result.type).toBe(DocumentType.ANTEPROYECTO);
      expect(result.status).toBe(stateList.EN_REVISION);
    });
  });

  describe('Métodos de UI (Mensajes y Modales)', () => {
    it('debería devolver los textos correctos para el tab ANTEPROYECTOS', () => {
      const tab = LoadedDocumentsTabType.ANTEPROYECTOS;

      expect(service.getEmptyMessage(tab)).toBe('No han sido registrados documentos de anteproyecto en el sistema');
      expect(service.getUploadModalDescription(tab)).toBe('Seleccione el archivo PDF del anteproyecto');
      expect(service.getUploadModalUserRole(tab)).toBe('Estudiante');
      expect(service.getConfirmModalDescription(tab)).toBe("¿Está seguro de cargar este anteproyecto? El estado cambiará a 'En revisión'.");
    });

    it('debería devolver los textos correctos para el tab PRESENTACIONES', () => {
      const tab = LoadedDocumentsTabType.PRESENTACIONES;

      expect(service.getEmptyMessage(tab)).toBe('No hay presentaciones registradas para este anteproyecto');
      expect(service.getUploadModalDescription(tab)).toBe('Seleccione el archivo PDF de la presentación');
      expect(service.getUploadModalUserRole(tab)).toBe('Jefe de Departamento');
      expect(service.getConfirmModalDescription(tab)).toBe('¿Está seguro de cargar esta presentación al consejo?');
    });

    it('debería devolver la configuración por defecto (presentaciones) si se pasa un tab desconocido', () => {
      const tab = 'OTRA_COSA';

      expect(service.getEmptyMessage(tab)).toBe('No hay presentaciones registradas para este anteproyecto');
      expect(service.getUploadModalUserRole(tab)).toBe('Jefe de Departamento');
    });
  });
});
