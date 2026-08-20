import { TestBed } from '@angular/core/testing';
import {
  ThesisFinalDeliveryDocumentResolverService,
  FinalDeliveryDocType
} from './thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';

// Utilidad de TypeScript para inferir los tipos anidados sin necesidad de importar sus interfaces directamente
type FinalDelivery = NonNullable<ThesisWork['finalDeliveries']>[number];
type PazYSalvo = NonNullable<ThesisWork['pazYSalvos']>[number];

describe('ThesisFinalDeliveryDocumentResolverService', () => {
  let service: ThesisFinalDeliveryDocumentResolverService;

  // Mocks estables y fuertemente tipados
  const mockMonographOld: FileDocument = {
    id: 'doc-mono-1',
    name: 'Monografia_v1.pdf',
    url: 'uploads/mono1.pdf',
    uploadDate: '2026-01-10T10:00:00Z',
    type: DocumentType.FORMATO_E,
    status: stateList.EN_REVISION,
  };

  const mockMonographRecent: FileDocument = {
    id: 'doc-mono-2',
    name: 'Monografia_v2.pdf',
    url: 'uploads/mono2.pdf',
    uploadDate: '2026-02-15T10:00:00Z',
    type: DocumentType.FORMATO_E,
    status: stateList.APROBADO,
  };

  const mockFormatoE: FileDocument = {
    id: 'doc-formE-1',
    name: 'FormatoE.pdf',
    url: 'uploads/formE.pdf',
    uploadDate: '2026-02-15T10:00:00Z',
    type: DocumentType.FORMATO_E,
    status: stateList.APROBADO,
  };

  const mockAnnexes: FileDocument = {
    id: 'doc-annex-1',
    name: 'Anexos.zip',
    url: 'uploads/anexos.zip',
    uploadDate: '2026-02-15T10:00:00Z',
    type: DocumentType.FORMATO_E,
    status: stateList.APROBADO,
  };

  const mockPazYSalvoOld: FileDocument = {
    id: 'pys-doc-1',
    name: 'PazYSalvo_v1.pdf',
    url: 'uploads/pys1.pdf',
    uploadDate: '2026-01-01T10:00:00Z',
    type: DocumentType.PAZ_Y_SALVO,
    status: stateList.EN_REVISION,
  };

  const mockPazYSalvoRecent: FileDocument = {
    id: 'pys-doc-2',
    name: 'PazYSalvo_v2.pdf',
    url: 'uploads/pys2.pdf',
    uploadDate: '2026-03-01T10:00:00Z',
    type: DocumentType.PAZ_Y_SALVO,
    status: stateList.APROBADO,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThesisFinalDeliveryDocumentResolverService],
    });
    service = TestBed.inject(ThesisFinalDeliveryDocumentResolverService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('resolveLatestFinalDeliveryDocument', () => {
    it('debe retornar null si la tesis es null/undefined o no contiene entregas finales', () => {
      const emptyThesis = { finalDeliveries: [] } as Partial<ThesisWork> as ThesisWork;

      expect(service.resolveLatestFinalDeliveryDocument(null, 'MONOGRAFIA')).toBeNull();
      expect(service.resolveLatestFinalDeliveryDocument(emptyThesis, 'MONOGRAFIA')).toBeNull();
    });

    it('debe resolver la Monografía más reciente ordenando por uploadDate (formato DD - MM - YYYY)', () => {
      const mockThesis: Partial<ThesisWork> = {
        finalDeliveries: [
          {
            id: 'fd-1',
            uploadDate: '10 - 01 - 2026', // <-- Usando el string exacto que espera parseDisplayDate
            monograph: mockMonographOld,
            formatE: mockFormatoE,
            status: stateList.EN_REVISION
          } as Partial<FinalDelivery> as FinalDelivery,
          {
            id: 'fd-2',
            uploadDate: '15 - 02 - 2026',
            monograph: mockMonographRecent,
            formatE: mockFormatoE,
            status: stateList.APROBADO
          } as Partial<FinalDelivery> as FinalDelivery,
        ],
      };

      const result = service.resolveLatestFinalDeliveryDocument(mockThesis as ThesisWork, 'MONOGRAFIA');

      expect(result).toBeDefined();
      expect(result?.id).toBe('doc-mono-2');
      expect(result?.name).toBe('Monografia_v2.pdf');
    });

    it('debe resolver el Formato E de la entrega final más reciente', () => {
      const mockThesis: Partial<ThesisWork> = {
        finalDeliveries: [
          {
            id: 'fd-1',
            uploadDate: '15 - 02 - 2026',
            monograph: mockMonographRecent,
            formatE: mockFormatoE,
            status: stateList.APROBADO
          } as Partial<FinalDelivery> as FinalDelivery,
        ],
      };

      const result = service.resolveLatestFinalDeliveryDocument(mockThesis as ThesisWork, 'FORMATO_E');

      expect(result).toEqual(mockFormatoE);
    });

    it('debe resolver los Anexos si existen en la entrega reciente o retornar null si son opcionales', () => {
      const thesisWithAnnexes: Partial<ThesisWork> = {
        finalDeliveries: [
          {
            id: 'fd-1',
            uploadDate: '15 - 02 - 2026',
            monograph: mockMonographRecent,
            formatE: mockFormatoE,
            annexes: mockAnnexes,
            status: stateList.APROBADO
          } as Partial<FinalDelivery> as FinalDelivery,
        ],
      };

      const thesisWithoutAnnexes: Partial<ThesisWork> = {
        finalDeliveries: [
          {
            id: 'fd-1',
            uploadDate: '15 - 02 - 2026',
            monograph: mockMonographRecent,
            formatE: mockFormatoE,
            status: stateList.APROBADO
          } as Partial<FinalDelivery> as FinalDelivery,
        ],
      };

      const resultWithAnnexes = service.resolveLatestFinalDeliveryDocument(thesisWithAnnexes as ThesisWork, 'ANEXOS');
      const resultWithoutAnnexes = service.resolveLatestFinalDeliveryDocument(thesisWithoutAnnexes as ThesisWork, 'ANEXOS');

      expect(resultWithAnnexes).toEqual(mockAnnexes);
      expect(resultWithoutAnnexes).toBeNull();
    });
  });

  describe('resolveLatestPazYSalvoDocument', () => {
    it('debe retornar null si la tesis es null/undefined o no tiene registros de paz y salvo', () => {
      const emptyThesis = { pazYSalvos: [] } as Partial<ThesisWork> as ThesisWork;

      expect(service.resolveLatestPazYSalvoDocument(null)).toBeNull();
      expect(service.resolveLatestPazYSalvoDocument(emptyThesis)).toBeNull();
    });

    it('debe resolver el documento de paz y salvo más reciente ordenando por registrationDate (Date object o ISO string)', () => {
      const mockThesis: Partial<ThesisWork> = {
        pazYSalvos: [
          {
            id: 'pys-1',
            registrationDate: new Date('2026-01-01T10:00:00Z'),
            document: mockPazYSalvoOld,
            academicApproved: false,
            financialApproved: false,
          } as Partial<PazYSalvo> as PazYSalvo,
          {
            id: 'pys-2',
            registrationDate: new Date('2026-03-01T10:00:00Z'),
            document: mockPazYSalvoRecent,
            academicApproved: true,
            financialApproved: true,
          } as Partial<PazYSalvo> as PazYSalvo,
        ],
      };

      const result = service.resolveLatestPazYSalvoDocument(mockThesis as ThesisWork);

      expect(result).toBeDefined();
      expect(result?.id).toBe('pys-doc-2');
      expect(result?.name).toBe('PazYSalvo_v2.pdf');
    });
  });
});
