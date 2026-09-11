// 1. Angular y Configuración
import { CorrespondenceTabConfig } from './correspondence.tab';
import { ThesisEvaluationContext } from './tab-config.interface';

// 2. Interfaces y Enums
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

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
  type: DocumentType.FORMATO_H,
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
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
    pazYSalvos: [], // Agregado para homogeneidad
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
  hasCorrespondence: false, // Declarado explícitamente para el mock
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('CorrespondenceTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Contexto base restaurado antes de cada prueba mediante la fábrica
    baseContext = createMockEvaluationContext();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Propiedades Estáticas', () => {
    it('debe tener el tabValue y rutas correctas', () => {
      expect(CorrespondenceTabConfig.tabValue).toBe('CORRESPONDENCIA');
      expect(CorrespondenceTabConfig.headerActionRoute).toBe('register_correspondence');
      expect(CorrespondenceTabConfig.columns).toHaveLength(4);
      expect(CorrespondenceTabConfig.modalConfig?.uploadDocumentType).toBe(DocumentType.FORMATO_H);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original intacto si no hay thesisWork', () => {
      baseContext.thesisWork = null;

      const result = CorrespondenceTabConfig.enrichEvaluationContext(baseContext);

      expect(result).toEqual(baseContext);
    });

    it('debe asignar hasCorrespondence en false si NO existen documentos de tipo FORMATO_H', () => {
      const mockDocE = createMockFileDocument({ type: DocumentType.FORMATO_E });
      const mockDocA = createMockFileDocument({ type: DocumentType.AVANCE });

      baseContext.thesisWork = createMockThesisWork({ documents: [mockDocE, mockDocA] });

      const result = CorrespondenceTabConfig.enrichEvaluationContext(baseContext);

      expect(result.hasCorrespondence).toBe(false);
    });

    it('debe asignar hasCorrespondence en true si existe al menos un documento de tipo FORMATO_H', () => {
      const mockDocE = createMockFileDocument({ type: DocumentType.FORMATO_E });
      const mockDocH = createMockFileDocument({ type: DocumentType.FORMATO_H });

      baseContext.thesisWork = createMockThesisWork({ documents: [mockDocE, mockDocH] });

      const result = CorrespondenceTabConfig.enrichEvaluationContext(baseContext);

      expect(result.hasCorrespondence).toBe(true);
    });
  });

  describe('getTableData', () => {
    it('debe retornar un array vacío si no se envían documentos (comportamiento defensivo contra nulos)', () => {
      // @ts-expect-error: Inyección intencional de null para probar la resiliencia (guardia if (!documents)) en runtime
      const rows = CorrespondenceTabConfig.getTableData(null, baseContext);

      expect(rows).toEqual([]);
    });

    it('debe retornar un array vacío si no hay documentos de tipo FORMATO_H', () => {
      const mockDoc = createMockFileDocument({ type: DocumentType.AVANCE });

      const rows = CorrespondenceTabConfig.getTableData([mockDoc], baseContext);

      expect(rows).toEqual([]);
    });

    it('debe filtrar y mapear correctamente los documentos de correspondencia (FORMATO_H)', () => {
      const uploadDateMock = new Date('2026-08-01');
      const mockDocH = createMockFileDocument({
        id: 'doc-1',
        name: 'Resolucion 123',
        type: DocumentType.FORMATO_H,
        uploadDate: uploadDateMock,
        status: stateList.EN_REVISION,
        url: 'http://docs/res'
      });
      const mockDocOther = createMockFileDocument({ type: DocumentType.AVANCE });

      const rows = CorrespondenceTabConfig.getTableData([mockDocH, mockDocOther], baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('doc-1');
      expect(rows[0].name).toBe('Resolucion 123');
      expect(rows[0].url).toBe('http://docs/res');
      expect(rows[0].status).toBe(stateList.EN_REVISION);
      expect(rows[0].date).toEqual(uploadDateMock);
      expect(rows[0].allowedActions).toContain('view-details');
    });

    it('debe aplicar valores por defecto (fallbacks) si el documento no tiene uploadDate o status definido', () => {
      const mockDoc = createMockFileDocument({
        id: 'doc-2',
        name: 'Resolucion Sin Fecha',
        type: DocumentType.FORMATO_H,
        url: 'http://docs/res2',
        uploadDate: undefined, // Ausencia deliberada
        status: undefined      // Ausencia deliberada
      });

      const rows = CorrespondenceTabConfig.getTableData([mockDoc], baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].date).toBe('Sin fecha');
      expect(rows[0].status).toBe(stateList.APROBADO);
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si la tesis está archivada, independientemente del rol', () => {
      baseContext.isArchived = true;
      baseContext.isJuror = true; // Intentamos forzar con un rol válido

      const buttons = CorrespondenceTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toEqual([]);
    });

    it('debe retornar array vacío si el usuario NO es jurado', () => {
      baseContext.isJuror = false;
      baseContext.isDirector = true; // Otro rol

      const buttons = CorrespondenceTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toEqual([]);
    });

    it('debe retornar el botón habilitado "Registrar Correspondencia" si es jurado y NO hay correspondencia', () => {
      baseContext.isJuror = true;
      baseContext.hasCorrespondence = false;

      const buttons = CorrespondenceTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Registrar Correspondencia');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_correspondence');
    });

    it('debe retornar el botón deshabilitado "Correspondencia Registrada" si es jurado y YA existe correspondencia', () => {
      baseContext.isJuror = true;
      baseContext.hasCorrespondence = true;

      const buttons = CorrespondenceTabConfig.getHeaderButtons(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Correspondencia Registrada');
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
