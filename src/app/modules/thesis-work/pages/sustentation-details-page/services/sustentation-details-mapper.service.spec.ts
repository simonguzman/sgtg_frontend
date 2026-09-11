// 1. Angular y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { SustentationDetailsMapperService } from './sustentation-details-mapper.service';

// 3. Dependencias
import { UserService } from '../../../../users/services/user.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

// ── Interfaces Estrictas para Spies ──────────────────────────────────────────

interface MockUserService {
  getUserFullName: jest.Mock;
}

interface MockThesisParticipantsFormatterService {
  getStudentNames: jest.Mock;
  getDirectorName: jest.Mock;
  getCodirectorName: jest.Mock;
  getAdvisorName: jest.Mock;
  getAssignedJurors: jest.Mock;
}

interface MockThesisFinalDeliveryDocumentResolverService {
  resolveLatestFinalDeliveryDocument: jest.Mock;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'FormatoE.pdf',
  url: 'http://e.com',
  type: DocumentType.FORMATO_E,
  uploadDate: new Date(),
  ...overrides
});

const createMockJurorVerdict = (overrides: Partial<JurorVerdict> = {}): JurorVerdict => ({
  jurorId: 'j1',
  evaluationDate: new Date('2026-07-28'),
  veredict: stateList.APROBADO,
  observations: '',
  attachedDocument: undefined,
  ...overrides
});

const createMockSpecialRequest = (overrides: Partial<SpecialRequest> = {}): SpecialRequest => ({
  id: 'req-1',
  requestType: SpecialRequestType.NUEVA_SUSTENTACION,
  description: 'Descripción por defecto',
  status: stateList.APROBADO,
  requestDate: new Date('2026-07-20T00:00:00Z'),
  directorId: 'dir-1',
  resolutionDetails: undefined,
  grantedDeadline: undefined,
  ...overrides
});

const createMockSustentation = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sus-123',
  status: SustentationStatus.PROGRAMADA,
  sustentationDate: new Date('2026-07-28T10:00:00Z'),
  location: 'Aula 101',
  assignedJurors: [],
  verdicts: [],
  formatEDocument: undefined,
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'tw-1',
  preliminaryDraftId: 'draft-1',
  documents: [],
  evaluations: [],
  specialRequests: [],
  correctedDeliveries: [],
  sustentations: [],
  advances: [],
  finalDeliveries: [],
  pazYSalvos: [],
  state: stateList.EN_DESARROLLO,
  createdDate: new Date(),
  // Se proveen los datos esenciales anidados para que el mapper no falle
  preliminaryDraftData: {
    proposalData: {
      title: 'Tesis IA',
      description: 'Desc',
      modality: 'Investigación'
    }
  } as any,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('SustentationDetailsMapperService', () => {
  let service: SustentationDetailsMapperService;

  let userSpy: MockUserService;
  let participantsSpy: MockThesisParticipantsFormatterService;
  let resolverSpy: MockThesisFinalDeliveryDocumentResolverService;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    userSpy = { getUserFullName: jest.fn() };

    participantsSpy = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn()
    };

    resolverSpy = { resolveLatestFinalDeliveryDocument: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        SustentationDetailsMapperService,
        { provide: UserService, useValue: userSpy },
        { provide: ThesisParticipantsFormatterService, useValue: participantsSpy },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: resolverSpy }
      ]
    });

    service = TestBed.inject(SustentationDetailsMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar la consola
  });

  describe('mapToView', () => {
    const sustentationId = 'sus-123';
    let baseThesisWork: ThesisWork;

    beforeEach(() => {
      // Configuramos respuestas por defecto para los espías en cada prueba
      participantsSpy.getStudentNames.mockReturnValue('Estudiante 1');
      participantsSpy.getDirectorName.mockReturnValue('Director 1');
      participantsSpy.getCodirectorName.mockReturnValue('Codirector 1');
      participantsSpy.getAssignedJurors.mockReturnValue('Jurado 1, Jurado 2');

      const defaultSustentation = createMockSustentation({
        id: sustentationId,
        formatEDocument: createMockFileDocument()
      });

      baseThesisWork = createMockThesisWork({
        sustentations: [defaultSustentation]
      });
    });

    it('debe retornar null si la sustentación no existe (ID inválido)', () => {
      const result = service.mapToView(baseThesisWork, 'invalid-id');
      expect(result).toBeNull();
    });

    it('debe mapear correctamente una sustentación con todos sus datos básicos y delegados', () => {
      const result = service.mapToView(baseThesisWork, sustentationId);

      expect(result).toBeTruthy();
      expect(result?.title).toBe('Tesis IA');
      expect(result?.modality).toBe('Investigación');
      expect(result?.authors).toBe('Estudiante 1');
      expect(result?.director).toBe('Director 1');
      expect(result?.codirector).toBe('Codirector 1');
      expect(result?.location).toBe('Aula 101');
      expect(result?.isAdministrativelyPostponed).toBe(false);
      expect(result?.formatEDocument?.url).toBe('http://e.com');
    });

    it('debe procesar el aplazamiento administrativo correctamente verificando las SpecialRequests (Postponed)', () => {
      const postponedSustentation = createMockSustentation({
        id: sustentationId,
        status: SustentationStatus.APLAZADA
      });

      const postponementRequest = createMockSpecialRequest({
        requestType: SpecialRequestType.NUEVA_SUSTENTACION,
        description: 'Motivo de salud (Enfermedad)'
      });

      const postponedWork = createMockThesisWork({
        sustentations: [postponedSustentation],
        specialRequests: [postponementRequest]
      });

      const result = service.mapToView(postponedWork, sustentationId);

      expect(result?.isAdministrativelyPostponed).toBe(true);
      expect(result?.postponementReason?.description).toBe('Motivo de salud (Enfermedad)');
      expect(result?.postponementReason?.type).toBe(SpecialRequestType.NUEVA_SUSTENTACION);
    });

    it('debe mapear veredictos y asignar el color css de estado correcto según stateList', () => {
      const verdictAprobado = createMockJurorVerdict({ jurorId: 'j1', veredict: stateList.APROBADO });
      const verdictNoAprobado = createMockJurorVerdict({ jurorId: 'j2', veredict: stateList.NO_APROBADO });
      const verdictConObs = createMockJurorVerdict({ jurorId: 'j3', veredict: stateList.APROBADO_CON_OBSERVACIONES });
      const verdictAplazado = createMockJurorVerdict({ jurorId: 'j4', veredict: stateList.APLAZADO });

      // @ts-expect-error: Inyección intencional de un estado no permitido por la interfaz para probar el fallback (default) del switch en runtime
      const verdictInvalido = createMockJurorVerdict({ jurorId: 'j5', veredict: 'ESTADO_INVENTADO' });

      const sustentationWithVerdicts = createMockSustentation({
        id: sustentationId,
        verdicts: [verdictAprobado, verdictNoAprobado, verdictConObs, verdictAplazado, verdictInvalido]
      });

      const workWithVerdicts = createMockThesisWork({ sustentations: [sustentationWithVerdicts] });

      userSpy.getUserFullName.mockImplementation((id: string) => `Profesor ${id}`);

      const result = service.mapToView(workWithVerdicts, sustentationId);

      expect(result?.verdicts.length).toBe(5);
      expect(result?.verdicts[0].statusColorClass).toBe('border-l-green-500'); // APROBADO
      expect(result?.verdicts[1].statusColorClass).toBe('border-l-red-500');   // NO_APROBADO
      expect(result?.verdicts[2].statusColorClass).toBe('border-l-amber-500'); // CON OBSERVACIONES
      expect(result?.verdicts[3].statusColorClass).toBe('border-l-orange-500');// APLAZADO
      expect(result?.verdicts[4].statusColorClass).toBe('border-l-gray-300');  // Fallback default comprobado
    });

    it('debe evaluar correctamente si mostrar el botón de documentos corregidos cuando hay observaciones', () => {
      const verdictConObs = createMockJurorVerdict({ veredict: stateList.APROBADO_CON_OBSERVACIONES });
      const sustentationWithObs = createMockSustentation({
        id: sustentationId,
        verdicts: [verdictConObs]
      });

      const workWithCorrections = createMockThesisWork({
        sustentations: [sustentationWithObs],
        correctedDeliveries: [] // Sin entregas previas, pero hubo observaciones
      });

      const result = service.mapToView(workWithCorrections, sustentationId);
      expect(result?.showCorrectedDocumentsButton).toBe(true);
    });

    it('debe mostrar el botón de documentos corregidos si existen entregas previas (aunque no haya observaciones recientes)', () => {
      const sustentationSinObs = createMockSustentation({
        id: sustentationId,
        verdicts: [createMockJurorVerdict({ veredict: stateList.APROBADO })] // Todo excelente
      });

      const workWithCorrections = createMockThesisWork({
        sustentations: [sustentationSinObs],
        // @ts-expect-error: Simulamos la existencia de un registro previo para probar length > 0
        correctedDeliveries: [{ id: 'corr-1' }]
      });

      const result = service.mapToView(workWithCorrections, sustentationId);
      expect(result?.showCorrectedDocumentsButton).toBe(true);
    });
  });
});
