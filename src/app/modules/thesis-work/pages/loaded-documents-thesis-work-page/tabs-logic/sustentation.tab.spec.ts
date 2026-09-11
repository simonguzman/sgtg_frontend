// 1. Archivo a probar
import { SustentationTabConfig } from './sustentation.tab';
import { ThesisEvaluationContext } from './tab-config.interface';

// 2. Interfaces y Enums
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Funciones Fábrica fuertemente tipadas (Cero 'any', cero 'as Type') ──────

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
  name: 'documento_base',
  url: 'http://url.com/doc.pdf',
  type: DocumentType.FORMATO_E,
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockJurorVerdict = (overrides: Partial<JurorVerdict> = {}): JurorVerdict => ({
  jurorId: 'juror-1',
  evaluationDate: new Date(),
  veredict: stateList.APROBADO,
  observations: 'Observación base',
  ...overrides
});

// Tipado directo a la interfaz oficial sin necesidad de aliases
const createMockSustentation = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sus-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  status: SustentationStatus.PROGRAMADA,
  verdicts: [],
  assignedJurors: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();

  // Construcción estricta para evitar el 'as any' en preliminaryDraftData
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
  currentUser: createMockUser({ id: 'juror-1' }),
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
  hasApprovedPazYSalvo: false,
  hasSustentationRegistered: false,
  isSustentationEvaluated: false,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('SustentationTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.clearAllMocks();

    // Contexto base prístino inicializado con la fábrica
    baseContext = createMockEvaluationContext();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Propiedades Estáticas', () => {
    it('debe tener la configuración inicial correcta', () => {
      expect(SustentationTabConfig.tabValue).toBe('SUSTENTACION');
      expect(SustentationTabConfig.headerActionRoute).toBe('register_sustentation');
      expect(SustentationTabConfig.columns).toHaveLength(4);
      expect(SustentationTabConfig.modalConfig?.uploadDocumentType).toBe(DocumentType.FORMATO_E);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto base intacto si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = SustentationTabConfig.enrichEvaluationContext(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe evaluar correctamente hasApprovedPazYSalvo examinando los documentos', () => {
      const mockDocument = createMockFileDocument({
        type: DocumentType.PAZ_Y_SALVO,
        status: stateList.APROBADO
      });
      baseContext.thesisWork = createMockThesisWork({ documents: [mockDocument] });

      const result = SustentationTabConfig.enrichEvaluationContext(baseContext);

      expect(result.hasApprovedPazYSalvo).toBe(true);
    });

    it('debe validar si el usuario actual es jurado de la sustentación activa', () => {
      const mockJuror = createMockUser({ id: 'juror-1' }); // currentUser ID

      // Ya no necesitamos el `as JurorItem`, TypeScript valida la compatibilidad estructural
      const mockSustentation = createMockSustentation({
        assignedJurors: [mockJuror]
      });

      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.enrichEvaluationContext(baseContext);

      expect(result.isJuror).toBe(true);
      expect(result.hasSustentationRegistered).toBe(true);
    });

    it('debe validar que isSustentationEvaluated sea true si tiene veredictos', () => {
      const mockVerdict = createMockJurorVerdict({ veredict: stateList.APROBADO });
      const mockSustentation = createMockSustentation({
        verdicts: [mockVerdict]
      });

      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.enrichEvaluationContext(baseContext);

      expect(result.isSustentationEvaluated).toBe(true);
    });
  });

  describe('getTableData (y resolveDisplayStatus)', () => {
    const dummyDocs: FileDocument[] = [];

    it('debe retornar array vacío si no hay sustentaciones (programación defensiva)', () => {
      baseContext.thesisWork = createMockThesisWork({ sustentations: undefined });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result).toEqual([]);
    });

    it('debe mostrar estado CANCELADO y fecha pendiente si es el caso', () => {
      const mockSustentation = createMockSustentation({
        id: 'sus-1',
        status: SustentationStatus.CANCELADA,
        sustentationDate: undefined // Ausencia intencional para fallback
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.CANCELADO);
      expect(result[0].date).toBe('Fecha pendiente');
      expect(result[0].allowedActions).toEqual(['view_sustentation_details']);
    });

    it('debe mostrar estado APLAZADO y formatear fecha si es aplazada administrativamente', () => {
      const dateRaw = new Date('2026-08-03T10:00:00Z');
      const mockSustentation = createMockSustentation({
        id: 'sus-2',
        status: SustentationStatus.APLAZADA,
        sustentationDate: dateRaw
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.APLAZADO);
      expect(result[0].date).toBe(dateRaw.toLocaleDateString('es-ES'));
    });

    it('debe mostrar EN_REVISION si no tiene veredictos y no está aplazada/cancelada', () => {
      const mockSustentation = createMockSustentation({
        id: 'sus-3',
        status: SustentationStatus.PROGRAMADA,
        verdicts: []
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.EN_REVISION);
    });

    it('debe mostrar APROBADO_CON_OBSERVACIONES si hubo observaciones previas y el último es APROBADO', () => {
      const verdictObservaciones = createMockJurorVerdict({ veredict: stateList.APROBADO_CON_OBSERVACIONES });
      const verdictAprobado = createMockJurorVerdict({ veredict: stateList.APROBADO }); // Último

      const mockSustentation = createMockSustentation({
        id: 'sus-4',
        verdicts: [verdictObservaciones, verdictAprobado]
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.APROBADO_CON_OBSERVACIONES);
    });

    it('debe mostrar el último veredicto si es diferente a las reglas de observación cruzadas', () => {
      const verdictObservaciones = createMockJurorVerdict({ veredict: stateList.APROBADO_CON_OBSERVACIONES });
      const verdictNoAprobado = createMockJurorVerdict({ veredict: stateList.NO_APROBADO }); // Último

      const mockSustentation = createMockSustentation({
        id: 'sus-5',
        verdicts: [verdictObservaciones, verdictNoAprobado]
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.NO_APROBADO);
    });

    it('debe añadir acción evaluate_sustentation para Admin o Jurado en estado PROGRAMADA sin veredictos', () => {
      baseContext.isAdmin = true;
      baseContext.isArchived = false;

      const mockSustentation = createMockSustentation({
        id: 'sus-6',
        status: SustentationStatus.PROGRAMADA,
        verdicts: []
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result[0].allowedActions).toContain('evaluate_sustentation');
    });

    it('NO debe añadir acción evaluate_sustentation si ya tiene veredictos emitidos', () => {
      baseContext.isAdmin = true;

      const mockSustentation = createMockSustentation({
        id: 'sus-7',
        verdicts: [createMockJurorVerdict({ veredict: stateList.APROBADO })]
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const result = SustentationTabConfig.getTableData(dummyDocs, baseContext);

      expect(result[0].allowedActions).not.toContain('evaluate_sustentation');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar vacío si está archivado o no es rol Consejo', () => {
      baseContext.isArchived = true;
      baseContext.isConsejo = true;
      expect(SustentationTabConfig.getHeaderButtons(baseContext)).toEqual([]);

      baseContext.isArchived = false;
      baseContext.isConsejo = false; // Falla rol
      expect(SustentationTabConfig.getHeaderButtons(baseContext)).toEqual([]);
    });

    it('debe pedir Paz y Salvo si no lo tiene (Rol Consejo)', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = false;

      const buttons = SustentationTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Requiere Paz y Salvo Aprobado');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe permitir Registrar Sustentación si hay Paz y Salvo y no hay sustentaciones', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = false;

      const buttons = SustentationTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Registrar Sustentación');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debe permitir Registrar Nueva Sustentación si fue APLAZADO administrativamente', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = true;

      const mockSustentation = createMockSustentation({ status: SustentationStatus.APLAZADA });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const buttons = SustentationTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Registrar Nueva Sustentación');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debe permitir Registrar Nueva Sustentación si fue APLAZADO en veredicto del jurado', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = true;

      const mockSustentation = createMockSustentation({
        status: SustentationStatus.PROGRAMADA,
        verdicts: [createMockJurorVerdict({ veredict: stateList.APLAZADO })]
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const buttons = SustentationTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Registrar Nueva Sustentación');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debe deshabilitar e indicar Sustentación Evaluada si ya terminó exitosamente o con otro veredicto final', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = true;
      baseContext.isSustentationEvaluated = true; // Context flag

      const mockSustentation = createMockSustentation({
        verdicts: [createMockJurorVerdict({ veredict: stateList.APROBADO })] // Diferente de APLAZADO
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const buttons = SustentationTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Sustentación Evaluada');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar e indicar Sustentación Programada si no ha sido evaluada y está activa', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = true;
      baseContext.isSustentationEvaluated = false; // Context flag

      const mockSustentation = createMockSustentation({
        status: SustentationStatus.PROGRAMADA,
        verdicts: [] // Sin veredictos
      });
      baseContext.thesisWork = createMockThesisWork({ sustentations: [mockSustentation] });

      const buttons = SustentationTabConfig.getHeaderButtons(baseContext);

      expect(buttons[0].label).toBe('Sustentación Programada');
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
