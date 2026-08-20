import { TestBed } from '@angular/core/testing';
import { LoadedDocumentsPreliminaryDraftMapperService } from './loaded-documents-preliminary-draft-mapper.service';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { LoadedDocumentsTabType } from '../models/loaded-documents-preliminary-draft-page.model';

// Importamos las utilidades como namespaces para poder espiarlas con jest.spyOn
import * as fileReaderUtils from '../../../../../core/utils/file-reader.utils';
import * as dateUtils from '../../../../../core/utils/date-utils';

describe('LoadedDocumentsPreliminaryDraftMapperService', () => {
  let service: LoadedDocumentsPreliminaryDraftMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadedDocumentsPreliminaryDraftMapperService]
    });
    service = TestBed.inject(LoadedDocumentsPreliminaryDraftMapperService);
  });

  afterEach(() => {
    // Limpiamos los mocks después de cada prueba para evitar que se filtren
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('buildNewDocumentRecord', () => {
    it('debería construir un nuevo registro de documento correctamente de forma asíncrona', async () => {
      // 1. Arrange (Preparación)
      const fileName = 'mi_documento.pdf';
      const mockFile = new File(['contenido falso'], fileName, { type: 'application/pdf' });
      const uploadType = DocumentType.ANTEPROYECTO;

      const mockDataUrl = 'data:application/pdf;base64,dummy_data';
      const mockDate = '08/08/2026';

      // Espiamos las funciones externas para aislar el test unitario
      const readFileSpy = jest.spyOn(fileReaderUtils, 'readFileAsDataUrl').mockResolvedValue(mockDataUrl);
      const dateSpy = jest.spyOn(dateUtils, 'formatDisplayDate').mockReturnValue(mockDate);

      // 2. Act (Ejecución)
      const result = await service.buildNewDocumentRecord(fileName, mockFile, uploadType);

      // 3. Assert (Validación)
      // Validamos que se hayan llamado nuestras utilidades con los parámetros correctos
      expect(readFileSpy).toHaveBeenCalledWith(mockFile);
      expect(dateSpy).toHaveBeenCalled(); // Se invoca con new Date() interno

      // Validamos la estructura y transformaciones del objeto devuelto
      expect(result.id).toEqual(expect.any(String)); // Valida que UUID genera un string
      expect(result.name).toBe('mi_documento'); // Verifica que limpió el .pdf
      expect(result.url).toBe(mockDataUrl); // Verifica que asignó la Data URL
      expect(result.uploadDate).toBe(mockDate); // Verifica la fecha formateada
      expect(result.type).toBe(DocumentType.ANTEPROYECTO);
      expect(result.status).toBe(stateList.EN_REVISION);
    });
  });

  describe('Métodos de UI (Mensajes y Modales)', () => {
    it('debería devolver los textos correctos para el tab ANTEPROYECTOS', () => {
      const tab = LoadedDocumentsTabType.ANTEPROYECTOS;

      // Evaluamos concordancia exacta de los strings para evitar falsos positivos
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
      // Forzamos un string diferente para probar el comportamiento por defecto de los ternarios
      const tab = 'OTRA_COSA' as LoadedDocumentsTabType;

      expect(service.getEmptyMessage(tab)).toBe('No hay presentaciones registradas para este anteproyecto');
      expect(service.getUploadModalUserRole(tab)).toBe('Jefe de Departamento');
    });
  });
});
