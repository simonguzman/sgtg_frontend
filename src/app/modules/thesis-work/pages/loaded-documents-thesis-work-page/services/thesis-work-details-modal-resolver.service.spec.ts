// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { ThesisWorkDetailsModalResolverService } from './thesis-work-details-modal-resolver.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Mapeo de Mocks Globales (Hoisted por Jest) ──────────────────────────────
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn()
}));
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

// ── Tipos Seguros Extraídos Dinámicamente (Cero dependencias externas extra) ──
type FinalDeliveryItem = NonNullable<ThesisWork['finalDeliveries']>[number];
type PazYSalvoItem = NonNullable<ThesisWork['pazYSalvos']>[number];

// ── Funciones Fábrica fuertemente tipadas (CERO 'any' ni 'as Type') ─────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
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
  type: DocumentType.MONOGRAFIA,
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

const createMockFinalDelivery = (overrides: Partial<FinalDeliveryItem> = {}): FinalDeliveryItem => ({
  id: 'del-1',
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  monograph: createMockFileDocument({ id: 'm-1', name: 'monograph' }),
  formatE: createMockFileDocument({ id: 'fe-1', name: 'formatE' }),
  annexes: undefined, // Anexos opcionales por defecto
  ...overrides
});

const createMockPazYSalvo = (overrides: Partial<PazYSalvoItem> = {}): PazYSalvoItem => ({
  id: 'pys-1',
  academicApproved: true,
  academicComments: '',
  financialApproved: true,
  financialComments: '',
  registrationDate: new Date(),
  document: createMockFileDocument({ id: 'doc-pys' }),
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
    thesisWorkId: 'tw-123',
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ThesisWorkDetailsModalResolverService', () => {
  let service: ThesisWorkDetailsModalResolverService;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [ThesisWorkDetailsModalResolverService]
    });
    service = TestBed.inject(ThesisWorkDetailsModalResolverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('resolve() (Switch principal)', () => {
    it('debe resolver null si el tab no coincide con ninguno (default case)', () => {
      const thesis = createMockThesisWork();
      expect(service.resolve('id-1', 'TAB_INVALIDO', thesis)).toBeNull();
    });
  });

  describe('resolveAdvance', () => {
    it('debe resolver un AVANCE correctamente si lo encuentra', () => {
      // Arrange
      const advance = createMockAdvance({ id: 'adv-1', title: 'Avance Especial' });
      const thesis = createMockThesisWork({ advances: [advance] });

      // Act
      const result = service.resolve('adv-1', 'AVANCES', thesis);

      // Assert
      expect(result?.title).toBe('Avance Especial');
    });

    it('debe retornar null si no encuentra el avance o el array no existe/está vacío', () => {
      const emptyThesis = createMockThesisWork({ advances: [] });
      const undefinedThesis = createMockThesisWork();
      undefinedThesis.advances = undefined; // Simulamos ausencia de la propiedad

      expect(service.resolve('adv-999', 'AVANCES', emptyThesis)).toBeNull();
      expect(service.resolve('adv-1', 'AVANCES', undefinedThesis)).toBeNull();
    });
  });

  describe('resolveDelivery', () => {
    it('debe resolver una ENTREGA FINAL con anexos y su estado original intacto', () => {
      // Arrange
      const delivery = createMockFinalDelivery({
        id: 'del-1',
        status: stateList.APROBADO,
        annexes: createMockFileDocument({ id: 'an-1' })
      });
      const thesis = createMockThesisWork({ finalDeliveries: [delivery] });

      // Act
      const result = service.resolve('del-1', 'ENTREGA FINAL', thesis);

      // Assert
      expect(result?.id).toBe('del-1');
      expect(result?.status).toBe(stateList.APROBADO);
      expect(result?.documents?.length).toBe(3); // Monografía, formato E y Anexos
    });

    it('debe resolver una ENTREGA FINAL sin anexos y aplicar estado por defecto EN_REVISION si no tiene', () => {
      // Arrange
      const delivery = createMockFinalDelivery({
        id: 'del-2',
        status: undefined, // Sin estado
        annexes: undefined // Sin anexos
      });
      const thesis = createMockThesisWork({ finalDeliveries: [delivery] });

      // Act
      const result = service.resolve('del-2', 'ENTREGA FINAL', thesis);

      // Assert
      expect(result?.documents?.length).toBe(2); // Solo Monografía y formato E
      expect(result?.status).toBe(stateList.EN_REVISION); // Fallback aplicado
    });

    it('debe retornar null si no encuentra la entrega final', () => {
      const thesis = createMockThesisWork({ finalDeliveries: [] });
      expect(service.resolve('del-999', 'ENTREGA FINAL', thesis)).toBeNull();
    });
  });

  describe('resolvePazYSalvo', () => {
    it('debe resolver PAZ Y SALVO aprobados y con comentarios académicos', () => {
      // Arrange
      const pys = createMockPazYSalvo({
        academicApproved: true,
        academicComments: 'Todo excelente',
        financialApproved: true,
        document: createMockFileDocument({ id: 'doc-pys' })
      });
      const thesis = createMockThesisWork({ pazYSalvos: [pys] });

      // Act
      const result = service.resolve('doc-pys', 'PAZ Y SALVO', thesis);

      // Assert
      expect(result?.comments).toContain('Aprobación Académica: ✅ Sí');
      expect(result?.comments).toContain('Obs: Todo excelente');
      expect(result?.comments).toContain('Aprobación Financiera: ✅ Sí');
      expect(result?.status).toBe(stateList.EN_REVISION); // Fallback natural del componente
    });

    it('debe resolver PAZ Y SALVO no aprobados y con comentarios financieros', () => {
      // Arrange
      const pys = createMockPazYSalvo({
        academicApproved: false,
        financialApproved: false,
        financialComments: 'Falta pago matrícula',
        document: createMockFileDocument({ id: 'doc-pys-2', status: stateList.NO_APROBADO })
      });
      const thesis = createMockThesisWork({ pazYSalvos: [pys] });

      // Act
      const result = service.resolve('doc-pys-2', 'PAZ Y SALVO', thesis);

      // Assert
      expect(result?.comments).toContain('Aprobación Académica: ❌ No');
      expect(result?.comments).toContain('Aprobación Financiera: ❌ No');
      expect(result?.comments).toContain('Obs: Falta pago matrícula');
      expect(result?.status).toBe(stateList.NO_APROBADO);
    });

    it('debe retornar null si no encuentra el registro de paz y salvo', () => {
      const thesis = createMockThesisWork({ pazYSalvos: [] });
      expect(service.resolve('doc-999', 'PAZ Y SALVO', thesis)).toBeNull();
    });
  });

  describe('resolveCorrespondence', () => {
    it('debe resolver CORRESPONDENCIA respetando su estado original', () => {
      // Arrange
      const doc = createMockFileDocument({ id: 'doc-1', status: stateList.EN_REVISION });
      const thesis = createMockThesisWork({ documents: [doc] });

      // Act
      const result = service.resolve('doc-1', 'CORRESPONDENCIA', thesis);

      // Assert
      expect(result?.title).toBe('Resolución / Correspondencia Final Oficial');
      expect(result?.status).toBe(stateList.EN_REVISION);
    });

    it('debe resolver CORRESPONDENCIA aplicando estado por defecto APROBADO', () => {
      // Arrange
      const doc = createMockFileDocument({ id: 'doc-2', status: undefined });
      const thesis = createMockThesisWork({ documents: [doc] });

      // Act
      const result = service.resolve('doc-2', 'CORRESPONDENCIA', thesis);

      // Assert
      expect(result?.status).toBe(stateList.APROBADO); // Fallback
    });

    it('debe retornar null si no encuentra la correspondencia', () => {
      const thesis = createMockThesisWork({ documents: [] });
      expect(service.resolve('doc-999', 'CORRESPONDENCIA', thesis)).toBeNull();
    });
  });

  describe('resolveSpecialRequest', () => {
    it('debe resolver SOLICITUDES con todos los detalles incluyendo grantedDeadline formateado', () => {
      // Arrange
      (formatThesisDate as jest.Mock).mockReturnValue('27 - 07 - 2026');

      const request = createMockSpecialRequest({
        id: 'req-1',
        requestType: SpecialRequestType.PRORROGA,
        description: 'Motivos de salud',
        resolutionDetails: 'Aprobado por comité',
        grantedDeadline: new Date('2026-07-27'),
        directorId: 'dir-1',
        status: stateList.APROBADO,
        requestDate: new Date('2026-07-20')
      });
      const thesis = createMockThesisWork({ specialRequests: [request] });

      // Act
      const result = service.resolve('req-1', 'SOLICITUDES', thesis);

      // Assert
      expect(result?.title).toBe(SpecialRequestType.PRORROGA);
      expect(result?.studentId).toBe('dir-1');
      expect(result?.comments).toContain('Motivos de salud');
      expect(result?.comments).toContain('Resolución del comité: Aprobado por comité');
      expect(result?.comments).toContain('Fecha concedida: 27 - 07 - 2026');
    });

    it('debe resolver SOLICITUDES solo con la descripción básica (sin resolución ni fecha)', () => {
      // Arrange
      const request = createMockSpecialRequest({
        id: 'req-2',
        description: 'Solo descripción sin respuesta aún',
        requestDate: new Date('2026-07-20')
      });
      const thesis = createMockThesisWork({ specialRequests: [request] });

      // Act
      const result = service.resolve('req-2', 'SOLICITUDES', thesis);

      // Assert
      expect(result?.comments).toBe('Solo descripción sin respuesta aún');
      expect(result?.comments).not.toContain('Resolución del comité');
      expect(result?.comments).not.toContain('Fecha concedida');
    });

    it('debe retornar null si no encuentra la solicitud especial', () => {
      const thesis = createMockThesisWork({ specialRequests: [] });
      expect(service.resolve('req-999', 'SOLICITUDES', thesis)).toBeNull();
    });
  });
});
