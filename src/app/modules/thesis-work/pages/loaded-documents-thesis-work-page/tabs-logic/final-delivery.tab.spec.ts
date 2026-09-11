// 1. Angular y Configuración
import { FinalDeliveryTabConfig } from './final-delivery.tab';
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
  formatThesisDate: jest.fn().mockReturnValue('15/08/2026')
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
  name: 'documento_base',
  url: 'http://url.com/doc.pdf',
  type: DocumentType.FORMATO_E,
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockFinalDelivery = (overrides: Partial<FinalDelivery> = {}): FinalDelivery => ({
  id: 'del-1',
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  monograph: createMockFileDocument({ name: 'Monografía' }),
  formatE: createMockFileDocument({ name: 'Formato E' }),
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
    pazYSalvos: [], // Agregado para homogeneidad con las otras fábricas
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

describe('FinalDeliveryTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.clearAllMocks();

    // Contexto base restaurado antes de cada prueba mediante la fábrica
    baseContext = createMockEvaluationContext();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Propiedades Estáticas y Configuración', () => {
    it('debe tener los valores estáticos, columnas y modalConfig correctos', () => {
      expect(FinalDeliveryTabConfig.tabValue).toBe('ENTREGA FINAL');
      expect(FinalDeliveryTabConfig.headerActionRoute).toBe('register_final_delivery');
      expect(FinalDeliveryTabConfig.columns).toHaveLength(4);
      expect(FinalDeliveryTabConfig.modalConfig?.uploadDocumentType).toBe(DocumentType.FORMATO_E);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original intacto si no hay thesisWork', () => {
      baseContext.thesisWork = null;

      const result = FinalDeliveryTabConfig.enrichEvaluationContext(baseContext);

      expect(result).toEqual(baseContext);
    });

    it('debe marcar isSuspendedOrCanceled como true si la tesis está SUSPENDIDA o CANCELADA', () => {
      baseContext.thesisWork = createMockThesisWork({ state: stateList.SUSPENDIDO });
      let result = FinalDeliveryTabConfig.enrichEvaluationContext(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);

      baseContext.thesisWork = createMockThesisWork({ state: stateList.CANCELADO });
      result = FinalDeliveryTabConfig.enrichEvaluationContext(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);
    });

    it('debe marcar hasFinalDelivery como true si existe al menos una entrega que NO sea NO_APROBADO', () => {
      const delivery1 = createMockFinalDelivery({ status: stateList.NO_APROBADO });
      const delivery2 = createMockFinalDelivery({ status: stateList.EN_REVISION });

      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [delivery1, delivery2] });

      const result = FinalDeliveryTabConfig.enrichEvaluationContext(baseContext);

      expect(result.hasFinalDelivery).toBe(true);
    });

    it('debe marcar hasFinalDelivery como false si todas las entregas son NO_APROBADO o no hay entregas', () => {
      const delivery1 = createMockFinalDelivery({ status: stateList.NO_APROBADO });
      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [delivery1] });

      let result = FinalDeliveryTabConfig.enrichEvaluationContext(baseContext);
      expect(result.hasFinalDelivery).toBe(false);

      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [] });
      result = FinalDeliveryTabConfig.enrichEvaluationContext(baseContext);
      expect(result.hasFinalDelivery).toBe(false);
    });
  });

  describe('getTableData', () => {
    const dummyDocs: FileDocument[] = [];

    it('debe retornar un array vacío si finalDeliveries es undefined (programación defensiva)', () => {
      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: undefined });

      const rows = FinalDeliveryTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows).toEqual([]);
    });

    it('debe mapear correctamente cuando la fecha es un objeto Date y formatearla', () => {
      const dateObj = new Date('2026-08-15');
      const mockDelivery = createMockFinalDelivery({
        id: 'delivery-1',
        uploadDate: dateObj,
        status: stateList.APROBADO,
        monograph: createMockFileDocument({ name: 'Monografía Final' })
      });

      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [mockDelivery] });

      const rows = FinalDeliveryTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Entrega Final - Monografía Final');
      expect(rows[0].uploadDate).toBe('15/08/2026'); // Valor del mock de formatThesisDate
      expect(formatThesisDate).toHaveBeenCalledWith(dateObj);
      expect(rows[0].status).toBe(stateList.APROBADO);
    });

    it('debe mantener la fecha tal cual si ya es un string (respuesta raw de API)', () => {
      const mockDelivery = createMockFinalDelivery({
        id: 'delivery-2',
        status: stateList.EN_REVISION
      });

      // Simulación segura para probar resiliencia en runtime sin romper el compilador TS
      mockDelivery.uploadDate = '2026-08-01' as unknown as Date;

      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [mockDelivery] });

      const rows = FinalDeliveryTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows[0].uploadDate).toBe('2026-08-01');
      expect(formatThesisDate).not.toHaveBeenCalled();
    });

    it('debe asignar "Sin fecha" si uploadDate es falsy y manejar fallbacks de nombres', () => {
      const mockDelivery = createMockFinalDelivery({
        id: 'delivery-3',
        uploadDate: undefined, // Ausencia intencional
        monograph: undefined,  // Ausencia intencional para fallback de nombre
        status: undefined      // Ausencia intencional para fallback de status
      });

      baseContext.thesisWork = createMockThesisWork({ finalDeliveries: [mockDelivery] });

      const rows = FinalDeliveryTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows[0].uploadDate).toBe('Sin fecha');
      expect(rows[0].name).toBe('Entrega Final - Documentación'); // Valida el fallback del nombre
      expect(rows[0].status).toBe(stateList.EN_REVISION); // Valida el estado fallback
    });

    it('debe forzar el estado de la fila a NO_APROBADO si la tesis completa está en estado NO_APROBADO', () => {
      const mockDelivery = createMockFinalDelivery({
        id: 'delivery-4',
        status: stateList.APROBADO // Debería ser sobreescrito por el estado general de la tesis
      });

      baseContext.thesisWork = createMockThesisWork({
        state: stateList.NO_APROBADO,
        finalDeliveries: [mockDelivery]
      });

      const rows = FinalDeliveryTabConfig.getTableData(dummyDocs, baseContext);

      expect(rows[0].status).toBe(stateList.NO_APROBADO);
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si la tesis está archivada, independientemente del rol', () => {
      baseContext.isArchived = true;
      baseContext.isDirector = true; // Intentamos forzar con un rol autorizado

      const buttons = FinalDeliveryTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toEqual([]);
    });

    it('debe retornar array vacío si el usuario no es Director ni Admin', () => {
      baseContext.isDirector = false;
      baseContext.isAdmin = false;
      baseContext.isStudent = true; // Rol no autorizado para este botón

      const buttons = FinalDeliveryTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toEqual([]);
    });

    it('debe retornar el botón habilitado "Cargar entrega final" si es Director y no hay entregas previas ni bloqueos', () => {
      baseContext.isDirector = true;
      baseContext.hasFinalDelivery = false;
      baseContext.isSuspendedOrCanceled = false;

      const buttons = FinalDeliveryTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Cargar entrega final');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_final_delivery');
    });

    it('debe retornar el botón deshabilitado "Entrega final registrada" si ya hay una entrega final activa', () => {
      baseContext.isDirector = true;
      baseContext.hasFinalDelivery = true;

      const buttons = FinalDeliveryTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Entrega final registrada');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe retornar el botón deshabilitado si la tesis está suspendida o cancelada', () => {
      baseContext.isAdmin = true;
      baseContext.isSuspendedOrCanceled = true;

      const buttons = FinalDeliveryTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe retornar el botón deshabilitado si la tesis no está aprobada (NO_APROBADO)', () => {
      baseContext.isDirector = true;
      baseContext.thesisWork = createMockThesisWork({ state: stateList.NO_APROBADO });

      const buttons = FinalDeliveryTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
