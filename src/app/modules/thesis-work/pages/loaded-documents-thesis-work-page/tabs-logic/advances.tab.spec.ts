// 1. Angular y Testing
import { AdvancesTabConfig } from './advances.tab';
import { ThesisEvaluationContext } from './tab-config.interface';

// 2. Interfaces y Enums
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Advance } from '../../../interfaces/advance.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Mapeo de Mocks Globales (Hoisted por Jest) ──────────────────────────────
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn(() => 'fecha-formateada-mock')
}));
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

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

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'documento',
  url: 'http://url.com/doc.pdf',
  type: DocumentType.AVANCE,
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockAdvance = (overrides: Partial<Advance> = {}): Advance => ({
  id: 'adv-1',
  title: 'Avance Base',
  comments: 'Comentarios base',
  uploadDate: new Date(),
  studentId: 'student-1',
  status: stateList.EN_REVISION,
  documents: [],
  ...overrides
});

const createMockEvaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
  id: 'eval-1',
  proposalId: 'prop-1',
  evaluatorId: 'eval-user-1',
  evaluatorName: 'Evaluador Base',
  evaluatorRole: 'DIRECTOR',
  date: new Date(),
  veredict: stateList.APROBADO,
  observations: '',
  signedDocuments: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();

  // Construcción estricta para evitar el 'as any'
  const mockDraftData: NonNullable<ThesisWork['preliminaryDraftData']> = {
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    state: stateList.APROBADO,
    createdData: new Date(),
    evaluators: [],
    evaluations: [],
    documents: [],
    maximumDeliveryDate: new Date(), // Agregado requerido por tu interfaz previa
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

describe('AdvancesTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Restaurar baseContext fresco para cada prueba usando la fábrica
    baseContext = createMockEvaluationContext();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Propiedades Estáticas', () => {
    it('debe tener el tabValue y rutas correctas', () => {
      expect(AdvancesTabConfig.tabValue).toBe('AVANCES');
      expect(AdvancesTabConfig.headerActionRoute).toBe('upload_advance');
      expect(AdvancesTabConfig.columns).toHaveLength(4);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = AdvancesTabConfig.enrichEvaluationContext(baseContext);

      expect(result).toEqual(baseContext);
    });

    it('debe calcular correctly requiredEvaluatorsCount basado en los roles de la propuesta', () => {
      // Configuramos el mock para que tenga Director y Asesor (esperado: 2 evaluadores)
      const thesis = createMockThesisWork();
      thesis.preliminaryDraftData!.proposalData.director = createMockUser({ id: 'dir-1' });
      thesis.preliminaryDraftData!.proposalData.advisor = createMockUser({ id: 'adv-1' });
      thesis.preliminaryDraftData!.proposalData.codirector = undefined;

      baseContext.thesisWork = thesis;

      const result = AdvancesTabConfig.enrichEvaluationContext(baseContext);

      expect(result.requiredEvaluatorsCount).toBe(2);
    });

    it('debe identificar isLatestAdvancePending si el primer avance está EN_REVISION', () => {
      const mockAdvance = createMockAdvance({ id: 'adv-1', status: stateList.EN_REVISION });
      baseContext.thesisWork = createMockThesisWork({ advances: [mockAdvance] });

      const result = AdvancesTabConfig.enrichEvaluationContext(baseContext);

      expect(result.latestAdvanceId).toBe('adv-1');
      expect(result.isLatestAdvancePending).toBe(true);
    });

    it('debe detectar hasFinalDelivery si existe un FORMATO_E', () => {
      const mockDocument = createMockFileDocument({ type: DocumentType.FORMATO_E });
      baseContext.thesisWork = createMockThesisWork({ documents: [mockDocument] });

      const result = AdvancesTabConfig.enrichEvaluationContext(baseContext);

      expect(result.hasFinalDelivery).toBe(true);
    });

    it('debe identificar isSuspendedOrCanceled correctamente', () => {
      baseContext.thesisWork = createMockThesisWork({ state: stateList.SUSPENDIDO });

      const result = AdvancesTabConfig.enrichEvaluationContext(baseContext);

      expect(result.isSuspendedOrCanceled).toBe(true);
    });
  });

  describe('getTableData', () => {
    let mockAdvance: Advance;

    beforeEach(() => {
      const mockDoc = createMockFileDocument({ url: 'http://docs/1' });
      mockAdvance = createMockAdvance({
        id: 'adv-1',
        title: 'Avance 1',
        comments: 'Comentarios',
        uploadDate: new Date('2026-08-03'),
        status: stateList.EN_REVISION,
        documents: [mockDoc]
      });

      baseContext.thesisWork = createMockThesisWork({ advances: [mockAdvance] });
    });

    it('debe mapear correctamente las propiedades del avance a AdvanceTableRow', () => {
      const rows = AdvancesTabConfig.getTableData([], baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('adv-1');
      expect(rows[0].name).toBe('Avance 1');
      expect(rows[0].url).toBe('http://docs/1');
      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(formatThesisDate).toHaveBeenCalled();
      expect(rows[0].allowedActions).toContain('view-details');
    });

    it('debe mapear correctamente la fecha si uploadDate viene como string y manejar arreglo vacío de documentos', () => {
      const mockAdvanceStrDate = createMockAdvance({
        id: 'adv-2',
        title: 'Avance String',
        status: stateList.EN_DESARROLLO,
        documents: undefined // Forzamos undefined para probar el fallback || []
      });

      // Simulación segura para probar resiliencia en runtime sin romper el compilador TS
      mockAdvanceStrDate.uploadDate = '2026-10-15' as unknown as Date;

      baseContext.thesisWork = createMockThesisWork({ advances: [mockAdvanceStrDate] });

      const rows = AdvancesTabConfig.getTableData([], baseContext);

      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(rows[0].documents).toEqual([]);
      expect(rows[0].url).toBe('');
    });

    it('debe permitir "evaluate-advance" a un evaluador asignado si no ha evaluado aún', () => {
      baseContext.isDirector = true;

      const rows = AdvancesTabConfig.getTableData([], baseContext);

      expect(rows[0].allowedActions).toContain('evaluate-advance');
    });

    it('NO debe permitir "evaluate-advance" si el usuario ya evaluó', () => {
      baseContext.isDirector = true;
      baseContext.currentUser = createMockUser({ id: 'user-1' });

      const mockEval = createMockEvaluation({ advanceId: 'adv-1', evaluatorId: 'user-1' });

      baseContext.thesisWork = createMockThesisWork({
        advances: [mockAdvance],
        evaluations: [mockEval]
      });

      const rows = AdvancesTabConfig.getTableData([], baseContext);

      expect(rows[0].allowedActions).not.toContain('evaluate-advance');
    });

    it('NO debe permitir "evaluate-advance" si existe una entrega final (Prioridad de Cierre)', () => {
      baseContext.isDirector = true;
      baseContext.hasFinalDelivery = true;

      const rows = AdvancesTabConfig.getTableData([], baseContext);

      expect(rows[0].allowedActions).not.toContain('evaluate-advance');
    });

    it('NO debe permitir "evaluate-advance" si el avance ya fue marcado como EVALUADO', () => {
      baseContext.isDirector = true;
      mockAdvance.status = stateList.EVALUADO;
      baseContext.thesisWork = createMockThesisWork({ advances: [mockAdvance] });

      const rows = AdvancesTabConfig.getTableData([], baseContext);

      expect(rows[0].allowedActions).not.toContain('evaluate-advance');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si está archivado', () => {
      baseContext.isArchived = true;

      const buttons = AdvancesTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toEqual([]);
    });

    it('debe retornar el botón de Cargar avance habilitado para Estudiantes con config normal', () => {
      baseContext.isStudent = true;

      const buttons = AdvancesTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Cargar nuevo avance');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debe deshabilitar y cambiar el label del botón si el último avance está EN_REVISION', () => {
      baseContext.isStudent = true;
      baseContext.isLatestAdvancePending = true;

      const buttons = AdvancesTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Avance en revisión');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar y cambiar el label si hay entrega final (tiene prioridad sobre avances)', () => {
      baseContext.isStudent = true;
      baseContext.isLatestAdvancePending = true;
      baseContext.hasFinalDelivery = true;

      const buttons = AdvancesTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Entrega final registrada');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar el botón si la tesis está suspendida o cancelada', () => {
      baseContext.isStudent = true;
      baseContext.isSuspendedOrCanceled = true;

      const buttons = AdvancesTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].disabled).toBe(true);
    });

    it('NO debe retornar botón de subida si el usuario no es estudiante ni admin', () => {
      baseContext.isDirector = true;
      baseContext.isStudent = false;
      baseContext.isAdmin = false;

      const buttons = AdvancesTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(0);
    });
  });
});
