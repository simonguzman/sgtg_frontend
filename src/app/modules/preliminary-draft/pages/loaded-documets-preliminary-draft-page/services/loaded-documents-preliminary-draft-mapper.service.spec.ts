import { TestBed } from '@angular/core/testing';
import { LoadedDocumentsPreliminaryDraftMapperService } from './loaded-documents-preliminary-draft-mapper.service';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';

describe('LoadedDocumentsPreliminaryDraftMapperService', () => {
  let service: LoadedDocumentsPreliminaryDraftMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadedDocumentsPreliminaryDraftMapperService]
    });
    service = TestBed.inject(LoadedDocumentsPreliminaryDraftMapperService);
  });

  it('debería construir un nuevo registro de documento correctamente', () => {
    const fileName = 'mi_documento.pdf';
    const uploadType = DocumentType.FORMATO_C;

    const result = service.buildNewDocumentRecord(fileName, uploadType);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('mi_documento'); // Debe remover el .pdf
    expect(result.type).toBe(DocumentType.FORMATO_C);
    expect(result.status).toBe(stateList.EN_REVISION);
    expect(result.url).toBe('');
    expect(result.uploadDate).toBeDefined();
  });

  it('debería devolver los textos correctos según el tab activo', () => {
    // Tab ANTEPROYECTOS
    expect(service.getEmptyMessage('ANTEPROYECTOS')).toContain('documentos de anteproyecto');
    expect(service.getUploadModalDescription('ANTEPROYECTOS')).toContain('PDF del anteproyecto');
    expect(service.getUploadModalUserRole('ANTEPROYECTOS')).toBe('Estudiante');
    expect(service.getConfirmModalDescription('ANTEPROYECTOS')).toContain('estado cambiará');

    // Tab PRESENTACIONES
    expect(service.getEmptyMessage('PRESENTACIONES')).toContain('presentaciones registradas');
    expect(service.getUploadModalDescription('PRESENTACIONES')).toContain('PDF de la presentación');
    expect(service.getUploadModalUserRole('PRESENTACIONES')).toBe('Jefe de Departamento');
    expect(service.getConfirmModalDescription('PRESENTACIONES')).toContain('cargar esta presentación');
  });
});
