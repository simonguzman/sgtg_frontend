// 1. Angular y Configuración
import { SpecialRequestTabConfig } from './special-request.tab';
import { ThesisEvaluationContext } from './tab-config.interface';

// 2. Interfaces y Enums
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';

// ── Funciones Fábrica fuertemente tipadas (Cero 'any') ───────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockJurorVerdict = (overrides: Partial<JurorVerdict> = {}): JurorVerdict => ({
  jurorId: 'juror-1',
  evaluationDate: new Date(),
  veredict: stateList.APROBADO,
  observations: '',
  attachedDocument: undefined,
  ...overrides
});

const createMockSustentation = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sus-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  status: SustentationStatus.PROGRAMADA,
  verdicts: [],
  assignedJurors: [],
  ...overrides
});

const createMockSpecialRequest = (overrides: Partial<SpecialRequest> = {}): SpecialRequest => ({
  id: 'req-1',
  requestType: SpecialRequestType.PRORROGA,
  description: 'Descripción base',
  resolutionDetails: undefined,
  grantedDeadline: undefined,
  directorId: 'dir-1',
  status: stateList.EN_REVISION,
  requestDate: new Date(),
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();

  // Construcción estricta para el borrador preliminar
  const mockDraftData: NonNullable<ThesisWork['preliminaryDraftData']> = {
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    state: stateList.APROBADO,
    createdData: new Date(),
    evaluators: [],
    evaluations: [],
    documents: [],
    proposalData: {
      id: 'prop-1',
      title: 'Mock Title',
      description: 'Desc',
      modality: Modality.TI,
      authors: [baseUser],
      director: baseUser,
      state: stateList.APROBADO,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    } as NonNullable<ThesisWork['preliminaryDraftData']>['proposalData']
  };

  return {
    thesisWorkId: 'thesis-1',
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
    isArchived: false,
    preliminaryDraftData: mockDraftData,
    ...overrides
  };
};

const createMockEvaluationContext = (overrides: Partial<ThesisEvaluationContext> = {}): ThesisEvaluationContext => ({
  thesisWork: createMockThesisWork(),
  currentUser: createMockUser(),
  isStudent: false,
  isDirector: false,
  isCodirector: false,
  isAdvisor: false,
  isAdmin: false,
  isArchived: false,
  isDecanatura: false,
  isJuror: false,
  isConsejo: false,
  latestAdvanceId: null,
  isLatestAdvancePending: false,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('SpecialRequestTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola para limpiar la terminal en Jest
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.clearAllMocks();

    // Contexto base prístino inicializado para cada test
    baseContext = createMockEvaluationContext();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Propiedades Estáticas', () => {
    it('debe tener los valores estáticos y columnas correctas', () => {
      expect(SpecialRequestTabConfig.tabValue).toBe('SOLICITUDES');
      expect(SpecialRequestTabConfig.headerActionRoute).toBe('register_special_request');
      expect(SpecialRequestTabConfig.columns).toHaveLength(4);
      expect(SpecialRequestTabConfig.modalConfig?.uploadDocumentType).toBeUndefined();
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original intacto si no hay thesisWork', () => {
      baseContext.thesisWork = null;

      const result = SpecialRequestTabConfig.enrichEvaluationContext(baseContext);

      expect(result).toEqual(baseContext);
    });

    it('debe marcar isSustentationFinalized como false si no hay sustentaciones o no hay veredictos', () => {
      // Sin sustentaciones
      baseContext.thesisWork = createMockThesisWork({ sustentations: [] });
      let result = SpecialRequestTabConfig.enrichEvaluationContext(baseContext);
      expect(result.isSustentationFinalized).toBe(false);

      // Con sustentación pero sin veredictos
      const sustentationSinVeredictos = createMockSustentation({ verdicts: [] });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [sustentationSinVeredictos] });

      result = SpecialRequestTabConfig.enrichEvaluationContext(baseContext);
      expect(result.isSustentationFinalized).toBe(false);
    });

    it('debe marcar isSustentationFinalized como false si el último veredicto es APLAZADO', () => {
      const verdictAprobado = createMockJurorVerdict({ veredict: stateList.APROBADO });
      const verdictAplazado = createMockJurorVerdict({ veredict: stateList.APLAZADO }); // Último en el arreglo

      const sustentation = createMockSustentation({ verdicts: [verdictAprobado, verdictAplazado] });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [sustentation] });

      const result = SpecialRequestTabConfig.enrichEvaluationContext(baseContext);

      expect(result.isSustentationFinalized).toBe(false);
    });

    it('debe marcar isSustentationFinalized como true si hay veredictos y el último NO es APLAZADO', () => {
      const verdictAplazado = createMockJurorVerdict({ veredict: stateList.APLAZADO });
      const verdictAprobado = createMockJurorVerdict({ veredict: stateList.APROBADO }); // Último en el arreglo

      const sustentation = createMockSustentation({ verdicts: [verdictAplazado, verdictAprobado] });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [sustentation] });

      const result = SpecialRequestTabConfig.enrichEvaluationContext(baseContext);

      expect(result.isSustentationFinalized).toBe(true);
    });
  });

  describe('getTableData', () => {
    const dummyDocs: FileDocument[] = [];

    it('debe retornar un array vacío si no hay thesisWork o specialRequests (programación defensiva)', () => {
      baseContext.thesisWork = createMockThesisWork({ specialRequests: undefined });

      const rows = SpecialRequestTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows).toEqual([]);
    });

    it('debe mapear correctamente los datos y manejar fechas nulas o ausentes de manera segura', () => {
      const mockRequest = createMockSpecialRequest({
        id: 'req-1',
        description: 'Prorroga de entrega',
        requestDate: undefined, // Ausencia intencional para forzar fallback
        status: stateList.APROBADO
      });

      baseContext.thesisWork = createMockThesisWork({ specialRequests: [mockRequest] });

      const rows = SpecialRequestTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('req-1');
      expect(rows[0].description).toBe('Prorroga de entrega');
      expect(rows[0].date).toBe('Sin fecha'); // Validación del fallback
      expect(rows[0].status).toBe(stateList.APROBADO);
      expect(rows[0].allowedActions).toEqual(['view-details']);
    });

    it('debe formatear la fecha correctamente cuando viene como objeto Date', () => {
      const dateObj = new Date('2026-08-15T10:00:00Z');
      const mockRequest = createMockSpecialRequest({
        id: 'req-2',
        requestDate: dateObj,
        status: stateList.EN_REVISION
      });

      baseContext.thesisWork = createMockThesisWork({ specialRequests: [mockRequest] });

      const rows = SpecialRequestTabConfig.getTableData(dummyDocs, baseContext);

      // Valida formateo nativo de toLocaleDateString
      const expectedDate = dateObj.toLocaleDateString('es-ES');
      expect(rows[0].date).toBe(expectedDate);
    });

    it('debe parsear y formatear la fecha correctamente si se recibe como string desde la API', () => {
      const dateString = '2026-08-15T10:00:00Z';
      const mockRequest = createMockSpecialRequest({
        id: 'req-2',
        status: stateList.EN_REVISION
      });

      // Simulación segura sin @ts-ignore para probar resiliencia en runtime (JavaScript/API Response)
      mockRequest.requestDate = dateString as unknown as Date;

      baseContext.thesisWork = createMockThesisWork({ specialRequests: [mockRequest] });

      const rows = SpecialRequestTabConfig.getTableData(dummyDocs, baseContext);

      const expectedDate = new Date(dateString).toLocaleDateString('es-ES');
      expect(rows[0].date).toBe(expectedDate);
    });

    it('NO debe agregar la acción evaluate_special_request si es el Consejo pero está archivado', () => {
      baseContext.isConsejo = true;
      baseContext.isArchived = true;

      const mockRequest = createMockSpecialRequest({ id: 'req-3', status: stateList.EN_REVISION });
      baseContext.thesisWork = createMockThesisWork({ specialRequests: [mockRequest] });

      const rows = SpecialRequestTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows[0].allowedActions).toEqual(['view-details']);
    });

    it('NO debe agregar la acción evaluate_special_request si es el Consejo pero el estado no es EN_REVISION', () => {
      baseContext.isConsejo = true;
      baseContext.isArchived = false;

      const mockRequest = createMockSpecialRequest({ id: 'req-4', status: stateList.APROBADO });
      baseContext.thesisWork = createMockThesisWork({ specialRequests: [mockRequest] });

      const rows = SpecialRequestTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows[0].allowedActions).toEqual(['view-details']);
    });

    it('DEBE agregar la acción evaluate_special_request si es Consejo, no está archivado y está EN_REVISION', () => {
      baseContext.isConsejo = true;
      baseContext.isArchived = false;

      const mockRequest = createMockSpecialRequest({ id: 'req-5', status: stateList.EN_REVISION });
      baseContext.thesisWork = createMockThesisWork({ specialRequests: [mockRequest] });

      const rows = SpecialRequestTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows[0].allowedActions).toContain('view-details');
      expect(rows[0].allowedActions).toContain('evaluate_special_request');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si está archivado', () => {
      baseContext.isArchived = true;
      baseContext.isDirector = true; // Intentamos forzar con un rol autorizado

      const buttons = SpecialRequestTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toEqual([]);
    });

    it('debe retornar array vacío si el usuario no es Director ni Admin', () => {
      baseContext.isDirector = false;
      baseContext.isAdmin = false;
      baseContext.isStudent = true; // Rol sin permisos para crear

      const buttons = SpecialRequestTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toEqual([]);
    });

    it('debe retornar botón habilitado "Registrar Solicitud Especial" si la sustentación NO ha finalizado', () => {
      baseContext.isAdmin = true;
      baseContext.isSustentationFinalized = false;

      const buttons = SpecialRequestTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Registrar Solicitud Especial');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_special_request');
    });

    it('debe retornar botón deshabilitado "Sustentación Finalizada" si la sustentación SÍ ha finalizado', () => {
      baseContext.isDirector = true;
      baseContext.isSustentationFinalized = true;

      const buttons = SpecialRequestTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Sustentación Finalizada');
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
