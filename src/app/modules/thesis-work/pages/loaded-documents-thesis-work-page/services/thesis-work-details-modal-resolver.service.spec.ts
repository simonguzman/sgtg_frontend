import { TestBed } from '@angular/core/testing';
import { ThesisWorkDetailsModalResolverService } from './thesis-work-details-modal-resolver.service';
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

jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn()
}));
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

type FinalDeliveryItem = NonNullable<ThesisWork['finalDeliveries']>[number];
type PazYSalvoItem = NonNullable<ThesisWork['pazYSalvos']>[number];

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
  annexes: undefined,
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

describe('ThesisWorkDetailsModalResolverService', () => {
  let service: ThesisWorkDetailsModalResolverService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [ThesisWorkDetailsModalResolverService]
    });
    service = TestBed.inject(ThesisWorkDetailsModalResolverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('resolve() (Switch principal)', () => {
    it('debe resolver null si el tab no coincide con ninguno (default case)', () => {
      const thesis = createMockThesisWork();
      expect(service.resolve('id-1', 'TAB_INVALIDO', thesis)).toBeNull();
    });
  });

  describe('resolveAdvance', () => {
    it('debe resolver un AVANCE correctamente si lo encuentra', () => {
      const advance = createMockAdvance({ id: 'adv-1', title: 'Avance Especial' });
      const thesis = createMockThesisWork({ advances: [advance] });

      const result = service.resolve('adv-1', 'AVANCES', thesis);

      expect(result?.title).toBe('Avance Especial');
    });

    it('resume quién radicó el informe, sus observaciones y sus revisiones', () => {
      (formatThesisDate as jest.Mock).mockReturnValue('25 - 04 - 2026');
      const advance = createMockAdvance({ id: '1', comments: 'Primer mes', uploadedBy: 'Eva Estudiante' });
      const thesis = createMockThesisWork({
        advances: [advance],
        evaluations: [{ id: 'r', proposalId: 'p', advanceId: '1', evaluatorId: '1', evaluatorName: 'Dora Directora',
          evaluatorRole: 'Director', veredict: stateList.EVALUADO, observations: '', date: new Date(2026, 3, 25) }]
      });

      const result = service.resolve('1', 'AVANCES', thesis);

      expect(result?.comments).toContain('Radicado por: Eva Estudiante');
      expect(result?.comments).toContain('Observaciones: Primer mes');
      expect(result?.comments).toContain('Revisión de Dora Directora (25 - 04 - 2026): ver notas adjuntas');
    });

    it('debe retornar null si no encuentra el avance o el array no existe/está vacío', () => {
      const emptyThesis = createMockThesisWork({ advances: [] });
      const undefinedThesis = createMockThesisWork();
      undefinedThesis.advances = undefined;

      expect(service.resolve('adv-999', 'AVANCES', emptyThesis)).toBeNull();
      expect(service.resolve('adv-1', 'AVANCES', undefinedThesis)).toBeNull();
    });
  });

  describe('resolveDelivery', () => {
    it('debe resolver una ENTREGA FINAL con anexos y su estado original intacto', () => {
      const delivery = createMockFinalDelivery({
        id: 'del-1',
        status: stateList.APROBADO,
        annexes: createMockFileDocument({ id: 'an-1' })
      });
      const thesis = createMockThesisWork({ finalDeliveries: [delivery] });

      const result = service.resolve('del-1', 'ENTREGA FINAL', thesis);

      expect(result?.id).toBe('del-1');
      expect(result?.status).toBe(stateList.APROBADO);
      expect(result?.documents?.length).toBe(3);
    });

    it('debe resolver una ENTREGA FINAL sin anexos y aplicar estado por defecto EN_REVISION si no tiene', () => {
      const delivery = createMockFinalDelivery({
        id: 'del-2',
        status: undefined,
        annexes: undefined
      });
      const thesis = createMockThesisWork({ finalDeliveries: [delivery] });

      const result = service.resolve('del-2', 'ENTREGA FINAL', thesis);

      expect(result?.documents?.length).toBe(2);
      expect(result?.status).toBe(stateList.EN_REVISION);
    });

    it('debe retornar null si no encuentra la entrega final', () => {
      const thesis = createMockThesisWork({ finalDeliveries: [] });
      expect(service.resolve('del-999', 'ENTREGA FINAL', thesis)).toBeNull();
    });
  });

  describe('resolvePazYSalvo', () => {
    it('debe resolver el PAZ Y SALVO de la solicitud de sustentación', () => {
      const pys = createMockPazYSalvo({
        academicApproved: true,
        academicComments: 'Todo excelente',
        financialApproved: true,
        document: createMockFileDocument({ id: 'doc-pys' })
      });
      const thesis = createMockThesisWork({ pazYSalvos: [pys] });

      const result = service.resolve('doc-pys', 'PAZ Y SALVO', thesis);

      expect(result?.title).toBe('Paz y salvo');
      expect(result?.comments).toContain('formato F');
      expect(result?.status).toBe(stateList.EN_REVISION);
    });

    it('el PAZ Y SALVO se describe como adjunto de la solicitud', () => {
      const pys = createMockPazYSalvo({
        academicApproved: false,
        financialApproved: false,
        financialComments: 'Falta pago matrícula',
        document: createMockFileDocument({ id: 'doc-pys-2', status: stateList.NO_APROBADO })
      });
      const thesis = createMockThesisWork({ pazYSalvos: [pys] });

      const result = service.resolve('doc-pys-2', 'PAZ Y SALVO', thesis);

      expect(result?.comments).toContain('solicitud de sustentación');
      expect(result?.status).toBe(stateList.NO_APROBADO);
    });

    it('debe retornar null si no encuentra el registro de paz y salvo', () => {
      const thesis = createMockThesisWork({ pazYSalvos: [] });
      expect(service.resolve('doc-999', 'PAZ Y SALVO', thesis)).toBeNull();
    });
  });

  describe('resolveCorrespondence', () => {
    it('debe resolver la VERSIÓN DEFINITIVA respetando su estado original', () => {
      const doc = createMockFileDocument({ id: 'doc-1', status: stateList.EN_REVISION });
      const thesis = createMockThesisWork({ documents: [doc] });

      const result = service.resolve('doc-1', 'CORRESPONDENCIA', thesis);

      expect(result?.title).toBe('Versión definitiva');
      expect(result?.status).toBe(stateList.EN_REVISION);
    });

    it('debe resolver CORRESPONDENCIA aplicando estado por defecto APROBADO', () => {
      const doc = createMockFileDocument({ id: 'doc-2', status: undefined });
      const thesis = createMockThesisWork({ documents: [doc] });

      const result = service.resolve('doc-2', 'CORRESPONDENCIA', thesis);

      expect(result?.status).toBe(stateList.APROBADO);
    });

    it('debe retornar null si no encuentra la correspondencia', () => {
      const thesis = createMockThesisWork({ documents: [] });
      expect(service.resolve('doc-999', 'CORRESPONDENCIA', thesis)).toBeNull();
    });
  });

  describe('resolveSpecialRequest', () => {
    it('debe resolver SOLICITUDES con todos los detalles incluyendo grantedDeadline formateado', () => {
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

      const result = service.resolve('req-1', 'SOLICITUDES', thesis);

      expect(result?.title).toBe(SpecialRequestType.PRORROGA);
      expect(result?.studentId).toBe('dir-1');
      expect(result?.comments).toContain('Motivos de salud');
      expect(result?.comments).toContain('Observaciones del Consejo: Aprobado por comité');
      expect(result?.comments).toContain('Reanudación a más tardar: 27 - 07 - 2026');
    });

    it('el cambio de título muestra lo propuesto, la decisión del Consejo y los documentos con la resolución', () => {
      (formatThesisDate as jest.Mock).mockReturnValue('10 - 05 - 2026');
      const solicitud = { id: 'a', name: 'solicitud', url: '/s', uploadDate: '2026-05-01', type: DocumentType.FORMATO };
      const resolucion = { id: 'b', name: 'resolucion', url: '/r', uploadDate: '2026-05-10', type: DocumentType.RESOLUCION };
      const request = createMockSpecialRequest({
        id: 'cambio-objetivos-0', requestType: SpecialRequestType.CAMBIO_TITULO, description: 'Cambio de alcance',
        proposedTitle: 'Nuevo título', proposedObjectives: ['General', 'Específico'], status: stateList.APROBADO,
        resolutionDate: new Date(2026, 4, 10), documents: [solicitud], resolution: resolucion
      });

      const result = service.resolve('cambio-objetivos-0', 'SOLICITUDES', createMockThesisWork({ specialRequests: [request] }));

      expect(result?.comments).toContain('Título propuesto: Nuevo título');
      expect(result?.comments).toContain('Objetivo general: General');
      expect(result?.comments).toContain('Objetivo específico 1: Específico');
      expect(result?.comments).toContain('Justificación: Cambio de alcance');
      expect(result?.comments).toContain('Decisión del Consejo (10 - 05 - 2026): Aprobado');
      expect(result?.documents).toEqual([solicitud, resolucion]);
    });

    it('debe resolver SOLICITUDES solo con la descripción básica (sin resolución ni fecha)', () => {
      const request = createMockSpecialRequest({
        id: 'req-2',
        description: 'Solo descripción sin respuesta aún',
        requestDate: new Date('2026-07-20')
      });
      const thesis = createMockThesisWork({ specialRequests: [request] });

      const result = service.resolve('req-2', 'SOLICITUDES', thesis);

      expect(result?.comments).toBe('Solo descripción sin respuesta aún');
      expect(result?.comments).not.toContain('Observaciones del Consejo');
      expect(result?.comments).not.toContain('Reanudación a más tardar');
    });

    it('debe retornar null si no encuentra la solicitud especial', () => {
      const thesis = createMockThesisWork({ specialRequests: [] });
      expect(service.resolve('req-999', 'SOLICITUDES', thesis)).toBeNull();
    });
  });
});
