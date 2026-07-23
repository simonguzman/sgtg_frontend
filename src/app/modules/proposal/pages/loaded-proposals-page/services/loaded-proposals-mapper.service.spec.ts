import { TestBed } from '@angular/core/testing';
import { LoadedProposalsMapperService } from './loaded-proposals-mapper.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';

describe('LoadedProposalsMapperService', () => {
  let service: LoadedProposalsMapperService;

  // Mock base ajustado a la interfaz real
  const mockDocument: Partial<FileDocument> = {
    id: 'doc-123', // Corregido: string en lugar de number
    name: 'Propuesta de prueba', // Corregido: name en lugar de title
    status: stateList.EN_REVISION,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadedProposalsMapperService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('mapDocumentToRow', () => {
    it('debe mantener las propiedades originales del documento en la fila', () => {
      const result = service.mapDocumentToRow(mockDocument as FileDocument, false, false);

      expect(result.id).toBe(mockDocument.id);
      expect(result.name).toBe(mockDocument.name); // Corregido a name
      expect(result.status).toBe(mockDocument.status);
    });

    it('debe permitir SOLO "download" por defecto', () => {
      const result = service.mapDocumentToRow(mockDocument as FileDocument, false, false);

      expect(result.allowedActions).toEqual(['download']);
      expect(result.allowedActions).not.toContain('evaluate');
    });

    it('debe añadir "evaluate" si se puede evaluar, está EN_REVISION y NO está archivado', () => {
      const result = service.mapDocumentToRow(mockDocument as FileDocument, true, false);

      expect(result.allowedActions).toEqual(['download', 'evaluate']);
    });

    it('NO debe añadir "evaluate" si canEvaluate es falso', () => {
      const result = service.mapDocumentToRow(mockDocument as FileDocument, false, false);

      expect(result.allowedActions).not.toContain('evaluate');
    });

    it('NO debe añadir "evaluate" si el estado no es EN_REVISION', () => {
      const documentWrongState = { ...mockDocument, status: stateList.APROBADO } as FileDocument;

      const result = service.mapDocumentToRow(documentWrongState, true, false);

      expect(result.allowedActions).not.toContain('evaluate');
    });

    it('NO debe añadir "evaluate" si el documento está archivado (isArchived = true)', () => {
      const result = service.mapDocumentToRow(mockDocument as FileDocument, true, true);

      expect(result.allowedActions).not.toContain('evaluate');
    });
  });
});
