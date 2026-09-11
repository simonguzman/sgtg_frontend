import { TestBed } from '@angular/core/testing';
import { EvaluationsMapperService } from './evaluations-mapper.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { stateList } from '../../../../core/enums/state.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { Proposal } from '../../../../modules/proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../../../modules/preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../../../modules/thesis-work/interfaces/thesis-work.interface';
import { SpecialRequest } from '../../../../modules/thesis-work/interfaces/special-request.interface';
import { SustentationRegistry } from '../../../../modules/thesis-work/interfaces/sustentation-registry.interface';
import { JurorVerdict } from '../../../../modules/thesis-work/interfaces/juror-verdict.interface';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';

// ── Funciones Fábrica fuertemente tipadas ─────────────────────────────────────

const createMockEvaluation = (overrides: Partial<Evaluation & { advanceId?: string; documentId?: string }> = {}): Evaluation => ({
  id: 'eval-1',
  evaluatorId: 'user-1',
  evaluatorName: 'Test Evaluator',
  evaluatorRole: 'Evaluador',
  veredict: stateList.EVALUADO,
  observations: 'Test observations',
  date: new Date('2024-01-01'),
  ...overrides
} as Evaluation);

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'Documento Base',
  url: 'http://default.pdf',
  type: DocumentType.FORMATO_B,
  uploadDate: new Date(), // Requerido por la interfaz FileDocument
  ...overrides
} as FileDocument);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  title: 'Propuesta Mock',
  evaluations: [],
  documents: [],
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalData: createMockProposal(),
  evaluations: [],
  documents: [],
  ...overrides
} as PreliminaryDraft);

const createMockSpecialRequest = (overrides: Partial<SpecialRequest> = {}): SpecialRequest => ({
  id: 'req-1',
  // Casteamos de forma segura el Enum que no tenemos importado
  requestType: 'PRORROGA_TIEMPO' as unknown as NonNullable<SpecialRequest['requestType']>,
  status: stateList.EN_REVISION,
  requestDate: new Date(),
  ...overrides
} as SpecialRequest);

const createMockJurorVerdict = (overrides: Partial<JurorVerdict> = {}): JurorVerdict => ({
  jurorId: 'juror-1',
  veredict: stateList.APROBADO,
  evaluationDate: new Date(),
  ...overrides
} as JurorVerdict);

const createMockSustentation = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sust-1',
  assignedJurors: [],
  verdicts: [],
  ...overrides
} as SustentationRegistry);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'thesis-1',
  advances: [],
  documents: [],
  evaluations: [],
  sustentations: [],
  specialRequests: [],
  ...overrides
} as ThesisWork);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluationsMapperService', () => {
  let service: EvaluationsMapperService;

  let mockUserService: {
    getUserFullName: jest.Mock<string, [string]>;
  };

  beforeEach(() => {
    // 🔕 Silenciadores globales
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUserService = {
      getUserFullName: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluationsMapperService,
        { provide: UserService, useValue: mockUserService },
      ],
    });

    service = TestBed.inject(EvaluationsMapperService);

    // Mock seguro de crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' },
      configurable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Casos base y validaciones nulas', () => {
    it('debería devolver un arreglo vacío si se pasa undefined', () => {
      expect(service.processProposalEvaluations(undefined)).toEqual([]);
      expect(service.processDraftEvaluations(undefined)).toEqual([]);
      expect(service.processThesisEvaluations(undefined)).toEqual([]);
    });
  });

  describe('processProposalEvaluations()', () => {
    it('debería mapear correctamente las evaluaciones de una Propuesta', () => {
      mockUserService.getUserFullName.mockReturnValue('Dr. Juan Pérez');

      const mockProposal = createMockProposal({
        title: 'Propuesta de Software',
        evaluations: [
          createMockEvaluation({
            id: 'eval-1',
            evaluatorId: 'user-1',
            veredict: stateList.APROBADO,
            observations: 'Excelente',
            date: new Date('2024-01-01'),
          })
        ]
      });

      const result = service.processProposalEvaluations(mockProposal);

      expect(result.length).toBe(1);
      expect(result[0].evaluatorName).toBe('Dr. Juan Pérez');
      expect(result[0].documentTargetName).toBe('Propuesta de Software');
      expect(result[0].veredict).toBe(stateList.APROBADO);
    });
  });

  describe('processDraftEvaluations()', () => {
    it('debería mapear correctamente las evaluaciones de un Anteproyecto', () => {
      mockUserService.getUserFullName.mockReturnValue('');

      const mockDraft = createMockPreliminaryDraft({
        proposalData: createMockProposal({ title: 'Anteproyecto de IA' }),
        evaluations: [
          createMockEvaluation({
            id: 'eval-2',
            evaluatorName: 'Evaluador Externo',
            veredict: stateList.NO_APROBADO,
            observations: 'Falta contexto',
            documentId: 'doc-1'
          })
        ],
        documents: [
          createMockFileDocument({ id: 'doc-1', name: 'Documento Principal', url: 'http://doc.pdf' })
        ]
      });

      const result = service.processDraftEvaluations(mockDraft);

      expect(result[0].evaluatorName).toBe('Evaluador Externo');
      expect(result[0].documentTargetName).toBe('Documento Principal');
      expect(result[0].signedDocuments.length).toBe(1);
    });
  });

  describe('processThesisEvaluations()', () => {
    it('debería procesar evaluaciones de avance y corrección correctamente', () => {
      const mockThesis = createMockThesisWork({
        advances: [{ id: 'adv-1', title: 'Avance Capítulo 1' } as NonNullable<ThesisWork['advances']>[0]],
        documents: [],
        evaluations: [
          createMockEvaluation({
            advanceId: 'adv-1',
            veredict: stateList.APROBADO,
            // FIX: Casteamos el string a FormattedDocument para satisfacer la interfaz, aunque en runtime sea un string
            signedDocuments: ['http://url-cruda.pdf' as unknown as FormattedDocument]
          }),
          createMockEvaluation({
            veredict: stateList.EN_REVISION,
            signedDocuments: [{ name: 'Correcciones', url: 'http://corr.pdf' } as FormattedDocument]
          })
        ]
      });

      const result = service.processThesisEvaluations(mockThesis);

      expect(result.length).toBe(2);

      expect(result[0].documentTargetName).toBe('Avance Capítulo 1');
      expect(result[0].signedDocuments[0].name).toBe('http://url-cruda.pdf');
      expect(result[0].signedDocuments[0].url).toBe('http://url-cruda.pdf');

      expect(result[1].documentTargetName).toBe('Documentos corregidos');
      expect(result[1].signedDocuments[0].name).toBe('Correcciones');
    });

    it('debería mapear veredictos de jurados ignorando los de tipo CORRECCION', () => {
      const mockThesis = createMockThesisWork({
        sustentations: [
          createMockSustentation({
            id: 'sust-1',
            assignedJurors: [{ id: 'juror-1', firstName: 'Ana', lastName: 'López' } as NonNullable<SustentationRegistry['assignedJurors']>[0]],
            verdicts: [
              createMockJurorVerdict({
                jurorId: 'juror-1',
                veredict: stateList.APROBADO,
                // FIX: Usamos createMockFileDocument en lugar de un objeto suelto
                attachedDocument: createMockFileDocument({ name: 'Acta', url: 'url' })
              }),
              createMockJurorVerdict({
                jurorId: 'juror-2',
                // FIX: Usamos createMockFileDocument
                attachedDocument: createMockFileDocument({ type: DocumentType.CORRECCION })
              })
            ]
          })
        ]
      });

      const result = service.processThesisEvaluations(mockThesis);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('verdict-juror-1-sust-1');
      expect(result[0].evaluatorRole).toBe('Jurado');
      expect(result[0].evaluatorName).toBe('Ana López');
    });

    it('debería procesar solicitudes especiales filtrando las que están EN_REVISION y aplicando formato Consejo', () => {
      const mockThesis = createMockThesisWork({
        specialRequests: [
          createMockSpecialRequest({
            id: 'req-1',
            requestType: 'PRORROGA_TIEMPO' as unknown as NonNullable<SpecialRequest['requestType']>,
            status: stateList.APROBADO
          }),
          createMockSpecialRequest({
            id: 'req-2',
            requestType: 'CANCELACION' as unknown as NonNullable<SpecialRequest['requestType']>,
            status: stateList.EN_REVISION
          })
        ]
      });

      const result = service.processThesisEvaluations(mockThesis);

      expect(result.length).toBe(1);
      expect(result[0].evaluatorRole).toBe('Consejo');
      expect(result[0].evaluatorName).toBe('Consejo de Facultad');
      expect(result[0].documentTargetName).toBe('Solicitud Especial (Prorroga tiempo)');
    });
  });

  describe('Helper formatEvaluationsForTable (Edge cases)', () => {
    it('debería usar Formato C como nombre si es Consejo y no hay nombre de documento previo', () => {
      const mockProposal = createMockProposal({
        title: 'Titulo default',
        evaluations: [
          createMockEvaluation({ evaluatorRole: 'Consejo', veredict: stateList.APROBADO })
        ],
        documents: [
          createMockFileDocument({ type: DocumentType.FORMATO_C, name: 'Formato C Oficial', url: 'url' })
        ]
      });

      const result = service.processProposalEvaluations(mockProposal);

      expect(result[0].documentTargetName).toBe('Formato C Oficial');
    });

    it('debería usar crypto.randomUUID como fallback si la evaluación no tiene id', () => {
      const mockProposal = createMockProposal({
        evaluations: [
          createMockEvaluation({ id: undefined, veredict: stateList.APROBADO })
        ]
      });

      const result = service.processProposalEvaluations(mockProposal);

      expect(result[0].id).toBe('mock-uuid-1234');
    });
  });
});
