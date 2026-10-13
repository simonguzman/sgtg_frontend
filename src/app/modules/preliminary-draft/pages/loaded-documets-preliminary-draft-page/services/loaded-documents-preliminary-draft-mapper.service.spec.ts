import { TestBed } from '@angular/core/testing';
import { LoadedDocumentsPreliminaryDraftMapperService } from './loaded-documents-preliminary-draft-mapper.service';
import { LoadedDocumentsTabType } from '../models/loaded-documents-preliminary-draft-page.model';


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
