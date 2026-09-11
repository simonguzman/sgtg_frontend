// 1. Angular y Configuración
import { PazYSalvoTabConfig } from './paz_y_salvo.tab';
import { ThesisEvaluationContext } from './tab-config.interface';

// 2. Interfaces y Enums
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { FinalDelivery } from '../../../interfaces/final-delivery.interface';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Mapeo de Mocks Globales (Hoisted por Jest) ──────────────────────────────
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn().mockReturnValue('fecha-formateada-mock')
}));

// FIX: Mockeamos la nueva dependencia de parseo introducida en la refactorización
jest.mock('../../../../../core/utils/date-utils', () => ({
  parseDisplayDate: jest.fn((date) => date instanceof Date ? date : new Date('2026-01-01'))
}));

import { formatThesisDate } from '../../../helpers/thesis-date.helper';
import { parseDisplayDate } from '../../../../../core/utils/date-utils';

// ── Tipos Seguros Extraídos Dinámicamente ────────────────────────────────────
type PazYSalvoItem = NonNullable<ThesisWork['pazYSalvos']>[number];

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

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
  type: DocumentType.PAZ_Y_SALVO,
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockFinalDelivery = (overrides: Partial<FinalDelivery> = {}): FinalDelivery => ({
  id: 'del-1',
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  monograph: createMockFileDocument({ name: 'Monografía', type: DocumentType.FORMATO_E }),
  formatE: createMockFileDocument({ name: 'Formato E', type: DocumentType.FORMATO_E }),
  ...overrides
});

const createMockPazYSalvo = (overrides: Partial<PazYSalvoItem> = {}): PazYSalvoItem => ({
  id: 'pys-1',
  academicApproved: false,
  academicComments: '',
  financialApproved: false,
  financialComments: '',
  registrationDate: new Date(),
  document: createMockFileDocument(),
  ...overrides
} as PazYSalvoItem);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
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
    // FIX: Eliminamos el 'as any' y usamos tipado estricto anidado
    preliminaryDraftData: {
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
    } as NonNullable<ThesisWork['preliminaryDraftData']>
  };
  return { ...baseThesis, ...overrides } as ThesisWork;
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

describe('PazYSalvoTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    jest.clearAllMocks();
    baseContext = createMockEvaluationContext();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Propiedades Estáticas', () => {
    it('debe tener los valores estáticos y columnas correctas', () => {
      expect(PazYSalvoTabConfig.tabValue).toBe('PAZ_Y_SALVO');
      expect(PazYSalvoTabConfig.headerActionRoute).toBe('register_paz_y_salvo');
      expect(PazYSalvoTabConfig.columns).toHaveLength(4);
      expect(PazYSalvoTabConfig.modalConfig?.uploadDocumentType).toBe(DocumentType.PAZ_Y_SALVO);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original intacto si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = PazYSalvoTabConfig.enrichEvaluationContext(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe detectar hasActiveFinalDelivery correctamente verificando estados', () => {
      // Caso Falso
      const deliveryNoAprobado = createMockFinalDelivery({ status: stateList.NO_APROBADO });
      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [deliveryNoAprobado] });
      let result = PazYSalvoTabConfig.enrichEvaluationContext(baseContext);
      expect(result.hasActiveFinalDelivery).toBe(false);

      // Caso Verdadero
      const deliveryEnRevision = createMockFinalDelivery({ status: stateList.EN_REVISION });
      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [deliveryEnRevision] });
      result = PazYSalvoTabConfig.enrichEvaluationContext(baseContext);
      expect(result.hasActiveFinalDelivery).toBe(true);
    });

    it('debe detectar hasApprovedPazYSalvo correctamente verificando los documentos internos', () => {
      // Caso Falso
      const pysEnRevision = createMockPazYSalvo({ document: createMockFileDocument({ status: stateList.EN_REVISION }) });
      baseContext.thesisWork = createMockThesisWork({ pazYSalvos: [pysEnRevision] });
      let result = PazYSalvoTabConfig.enrichEvaluationContext(baseContext);
      expect(result.hasApprovedPazYSalvo).toBe(false);

      // Caso Verdadero
      const pysAprobado = createMockPazYSalvo({ document: createMockFileDocument({ status: stateList.APROBADO }) });
      baseContext.thesisWork = createMockThesisWork({ pazYSalvos: [pysAprobado] });
      result = PazYSalvoTabConfig.enrichEvaluationContext(baseContext);
      expect(result.hasApprovedPazYSalvo).toBe(true);
    });

    it('debe detectar isSuspendedOrCanceled correctamente a partir del estado de la tesis', () => {
      baseContext.thesisWork = createMockThesisWork({ state: stateList.SUSPENDIDO });
      let result = PazYSalvoTabConfig.enrichEvaluationContext(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);

      baseContext.thesisWork = createMockThesisWork({ state: stateList.CANCELADO });
      result = PazYSalvoTabConfig.enrichEvaluationContext(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);
    });
  });

  describe('getTableData (y parseo de fechas)', () => {
    it('debe filtrar los documentos y solo retornar los de tipo PAZ_Y_SALVO', () => {
      const docPys = createMockFileDocument({ id: 'doc-1', type: DocumentType.PAZ_Y_SALVO });
      const docOther = createMockFileDocument({ id: 'doc-2', type: DocumentType.FORMATO_E });

      const rows = PazYSalvoTabConfig.getTableData([docPys, docOther], baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('doc-1');
    });

    it('debe parsear y formatear la fecha correctamente usando parseDisplayDate si es un objeto Date', () => {
      const dateObj = new Date('2026-08-01');
      const docPys = createMockFileDocument({ type: DocumentType.PAZ_Y_SALVO, uploadDate: dateObj });

      const rows = PazYSalvoTabConfig.getTableData([docPys], baseContext);

      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(parseDisplayDate).toHaveBeenCalledWith(dateObj);
      expect(formatThesisDate).toHaveBeenCalled();
    });

    it('debe parsear y formatear la fecha correctamente si viene expuesta como string por la API', () => {
      const dateString = '2026-08-01T00:00:00Z';
      const docPys = createMockFileDocument({
        type: DocumentType.PAZ_Y_SALVO,
        // FIX: Usamos 'never' en vez de 'any' para simular un payload de backend
        // en una interfaz que espera un Date localmente, sin romper el tipado estricto.
        uploadDate: dateString as never
      });

      const rows = PazYSalvoTabConfig.getTableData([docPys], baseContext);

      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(parseDisplayDate).toHaveBeenCalledWith(dateString);
      expect(formatThesisDate).toHaveBeenCalled();
    });

    it('debe asignar "Sin fecha" y estado EN_REVISION junto a otros fallbacks si los datos faltan', () => {
      const docPys = createMockFileDocument({
        type: DocumentType.PAZ_Y_SALVO,
        uploadDate: undefined,
        status: undefined,
        url: undefined
      });

      const rows = PazYSalvoTabConfig.getTableData([docPys], baseContext);

      expect(rows[0].uploadDate).toBe('Sin fecha');
      expect(rows[0].status).toBe(stateList.EN_REVISION);
      expect(rows[0].url).toBe('');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si la tesis está archivada', () => {
      baseContext.isArchived = true;
      baseContext.isDecanatura = true; // Aún con permisos
      expect(PazYSalvoTabConfig.getHeaderButtons(baseContext)).toEqual([]);
    });

    it('debe retornar array vacío si el usuario no es Decanatura ni Admin', () => {
      baseContext.isDecanatura = false;
      baseContext.isAdmin = false;
      baseContext.isDirector = true; // Rol sin permiso aquí
      expect(PazYSalvoTabConfig.getHeaderButtons(baseContext)).toEqual([]);
    });

    it('debe retornar botón habilitado "Registrar Paz y Salvo" si todo es válido', () => {
      baseContext.isDecanatura = true;
      baseContext.hasActiveFinalDelivery = true;
      baseContext.hasApprovedPazYSalvo = false;
      baseContext.isSuspendedOrCanceled = false;

      const buttons = PazYSalvoTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Registrar Paz y Salvo');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_paz_y_salvo');
    });

    it('debe cambiar el label y deshabilitar si NO hay entrega final activa', () => {
      baseContext.isAdmin = true;
      baseContext.hasActiveFinalDelivery = false; // Bloqueante

      const buttons = PazYSalvoTabConfig.getHeaderButtons(baseContext);
      expect(buttons[0].label).toBe('Requiere Entrega Final');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe cambiar el label y deshabilitar si YA hay un Paz y Salvo aprobado', () => {
      baseContext.isDecanatura = true;
      baseContext.hasActiveFinalDelivery = true;
      baseContext.hasApprovedPazYSalvo = true; // Ya existe

      const buttons = PazYSalvoTabConfig.getHeaderButtons(baseContext);
      expect(buttons[0].label).toBe('Paz y Salvo Registrado');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar el botón si la tesis está suspendida o cancelada sin importar lo demás', () => {
      baseContext.isDecanatura = true;
      baseContext.hasActiveFinalDelivery = true;
      baseContext.hasApprovedPazYSalvo = false;
      baseContext.isSuspendedOrCanceled = true; // Bloqueante

      const buttons = PazYSalvoTabConfig.getHeaderButtons(baseContext);
      expect(buttons[0].label).toBe('Registrar Paz y Salvo'); // Conserva la semántica
      expect(buttons[0].disabled).toBe(true); // Pero bloquea la acción
    });
  });
});
