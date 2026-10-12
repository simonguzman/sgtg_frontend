import { TestBed } from '@angular/core/testing';
import { LoadedProposalsMapperService } from './loaded-proposals-mapper.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
describe('LoadedProposalsMapperService', () => {
  let service: LoadedProposalsMapperService;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  const mockDocument: FileDocument = {
    id: 'doc-123',
    name: 'Propuesta de prueba',
    url: 'http://storage.com/propuesta.pdf',
    uploadDate: '08 - 08 - 2026',
    type: DocumentType.PROPUESTA,
    status: stateList.EN_REVISION,
  };
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [LoadedProposalsMapperService]
    });
    service = TestBed.inject(LoadedProposalsMapperService);
  });
  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });
  describe('Método: mapDocumentToRow', () => {
    it('una versión del formato A muestra su número y el estado de su revisión', () => {
      const result = service.mapDocumentToRow({ ...mockDocument, version: 2, status: stateList.NO_APROBADO }, true, false);
      expect(result.version).toBe(2);
      expect(result.status).toBe(stateList.NO_APROBADO);
      expect(result.allowedActions).toEqual(['download']);
    });
    it('formatea la fecha de carga para mostrarla en la tabla', () => {
      const result = service.mapDocumentToRow({ ...mockDocument, uploadDate: new Date(2026, 9, 11) }, false, false);
      expect(result.uploadDate).toBe('11 - 10 - 2026');
    });
    it('la carta de aceptación no muestra versión ni estado de revisión', () => {
      const carta: FileDocument = { ...mockDocument, type: DocumentType.FORMATO, version: 1, status: undefined };
      const result = service.mapDocumentToRow(carta, true, false);
      expect(result.version).toBeUndefined();
      expect(result.status).toBeUndefined();
    });
    it('debe mantener las propiedades originales del documento en la fila mapeada', () => {
      const result = service.mapDocumentToRow(mockDocument, false, false);
      expect(result.id).toBe(mockDocument.id);
      expect(result.name).toBe(mockDocument.name);
      expect(result.url).toBe(mockDocument.url);
      expect(result.uploadDate).toBe(mockDocument.uploadDate);
      expect(result.type).toBe(mockDocument.type);
      expect(result.status).toBe(mockDocument.status);
    });
    it('debe permitir SOLO "download" por defecto', () => {
      const result = service.mapDocumentToRow(mockDocument, false, false);
      expect(result.allowedActions).toEqual(['download']);
      expect(result.allowedActions).not.toContain('evaluate');
    });
    it('debe añadir "evaluate" si se puede evaluar, está EN_REVISION y NO está archivado', () => {
      const result = service.mapDocumentToRow(mockDocument, true, false);
      expect(result.allowedActions).toEqual(['download', 'evaluate']);
    });
    it('NO debe añadir "evaluate" si canEvaluate es falso', () => {
      const result = service.mapDocumentToRow(mockDocument, false, false);
      expect(result.allowedActions).not.toContain('evaluate');
    });
    it('NO debe añadir "evaluate" si el estado del documento no es EN_REVISION', () => {
      const documentWrongState: FileDocument = { ...mockDocument, status: stateList.APROBADO };
      const result = service.mapDocumentToRow(documentWrongState, true, false);
      expect(result.allowedActions).not.toContain('evaluate');
    });
    it('NO debe añadir "evaluate" si la propuesta está archivada (isArchived = true)', () => {
      const result = service.mapDocumentToRow(mockDocument, true, true);
      expect(result.allowedActions).not.toContain('evaluate');
    });
  });
});
