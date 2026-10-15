import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { CorrectedDocumentsFacadeService } from './corrected-documents-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../../interfaces/corrected-delivery.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
}

interface MockThesisParticipantsFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork | null]>;
  getDirectorName: jest.Mock<string, [ThesisWork | null]>;
  getCodirectorName: jest.Mock<string | null, [ThesisWork | null]>;
  getAdvisorName: jest.Mock<string | null, [ThesisWork | null]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
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
  ...overrides
});

const createMockCorrectedDelivery = (overrides: Partial<CorrectedDelivery> = {}): CorrectedDelivery => ({
  id: 'del-1',
  uploadDate: '2026-07-28',
  status: stateList.EN_REVISION,
  monograph: createMockFileDocument({ name: 'monografia', url: 'http://mono.com', type: DocumentType.MONOGRAFIA }),
  annexes: createMockFileDocument({ name: 'anexos', url: 'http://anexos.com', type: DocumentType.ANEXOS }),
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'tw-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    correctedDeliveries: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      maximumDeliveryDate: new Date(),
      proposalData: {
        id: 'prop-1',
        title: 'Tesis IA',
        description: 'Uso de IA',
        modality: undefined as any,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    },
    sustentations: []
  };
  return { ...baseThesis, ...overrides };
};

describe('CorrectedDocumentsFacadeService', () => {
  let service: CorrectedDocumentsFacadeService;

  let authSpy: MockAuthService;
  let participantsSpy: MockThesisParticipantsFormatterService;
  let downloadSpy: MockFileDownloadService;
  let notificationSpy: MockNotificationService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    authSpy = {
      currentUser: signal(createMockUser({ id: 'user-123' }))
    };

    participantsSpy = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn()
    };

    downloadSpy = {
      download: jest.fn().mockResolvedValue(undefined)
    };

    notificationSpy = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CorrectedDocumentsFacadeService,
        { provide: ThesisWorkService, useValue: {} },
        { provide: AuthService, useValue: authSpy },
        { provide: ThesisParticipantsFormatterService, useValue: participantsSpy },
        { provide: FileDownloadService, useValue: downloadSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(CorrectedDocumentsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('findThesisWork', () => {
    it('debe retornar null si no se provee un ID', () => {
      expect(service.findThesisWork(null, [])).toBeNull();
    });

    it('debe encontrar el trabajo de grado correcto', () => {
      const work1 = createMockThesisWork({ thesisWorkId: 'tw-1' });
      const work2 = createMockThesisWork({ thesisWorkId: 'tw-2' });

      expect(service.findThesisWork('tw-2', [work1, work2])?.thesisWorkId).toBe('tw-2');
    });

    it('debe retornar null si no encuentra el trabajo en la lista', () => {
      const work1 = createMockThesisWork({ thesisWorkId: 'tw-1' });

      expect(service.findThesisWork('tw-2', [work1])).toBeNull();
    });
  });

  describe('Validaciones de Roles (isDirector, isJuror)', () => {
    it('isDirector debe retornar true si el usuario actual es el director de la tesis', () => {
      const thesis = createMockThesisWork();
      thesis.preliminaryDraftData!.proposalData.director = createMockUser({ id: 'user-123' });

      expect(service.isDirector(thesis)).toBe(true);
    });

    it('isDirector debe retornar false si el usuario no es el director', () => {
      const thesis = createMockThesisWork();
      thesis.preliminaryDraftData!.proposalData.director = createMockUser({ id: 'other-user' });

      expect(service.isDirector(thesis)).toBe(false);
    });

  });

  describe('Permisos según el estado de la sustentación', () => {
    const conSustentacion = (state: 'EN_AJUSTES' | 'AJUSTES_RADICADOS' | 'APROBADA', coordinatorId = 'user-123') =>
      createMockThesisWork({ sustentation: { state, requestDate: null, adjustmentsDeadline: null,
        secondSessionDeadline: null, coordinatorId, jurorIds: [coordinatorId, 'otro'], currentSessionDate: null,
        hasPendingNewDate: false, pazYSalvoApproved: true } });

    it('isJuror es true solo para el jurado coordinador de la sesión actual', () => {
      expect(service.isJuror(conSustentacion('AJUSTES_RADICADOS'))).toBe(true);
      expect(service.isJuror(conSustentacion('AJUSTES_RADICADOS', 'otro'))).toBe(false);
      expect(service.isJuror(createMockThesisWork())).toBe(false);
    });

    it('el director radica los ajustes solo en EN_AJUSTES', () => {
      expect(service.canDirectorUpload(conSustentacion('EN_AJUSTES'), true, false)).toBe(true);
      expect(service.canDirectorUpload(conSustentacion('AJUSTES_RADICADOS'), true, false)).toBe(false);
      expect(service.canDirectorUpload(conSustentacion('EN_AJUSTES'), false, false)).toBe(false);
      expect(service.canDirectorUpload(conSustentacion('EN_AJUSTES'), true, true)).toBe(false);
    });

    it('el coordinador verifica solo los ajustes radicados', () => {
      expect(service.canJurorEvaluate(conSustentacion('AJUSTES_RADICADOS'), true, false)).toBe(true);
      expect(service.canJurorEvaluate(conSustentacion('APROBADA'), true, false)).toBe(false);
      expect(service.canJurorEvaluate(conSustentacion('AJUSTES_RADICADOS'), false, false)).toBe(false);
    });
  });

  describe('buildTableData', () => {
    it('debe retornar un arreglo vacío si no hay entregas (null object)', () => {
      expect(service.buildTableData(null)).toEqual([]);
    });

    it('debe mapear correctamente las entregas a filas de la tabla', () => {
      const delivery = createMockCorrectedDelivery({ id: 'del-1', uploadDate: '2026-07-28', status: stateList.APROBADO });
      const thesis = createMockThesisWork({ correctedDeliveries: [delivery] });

      const result = service.buildTableData(thesis);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('del-1');
      expect(result[0].name).toBe('Ajustes radicados 1');
      expect(result[0].date).toBe('2026-07-28');
      expect(result[0].status).toBe(stateList.APROBADO);
      expect(result[0].rawDelivery).toEqual(delivery);
    });
  });

  describe('Descarga de documentos', () => {
    const mockDelivery = createMockCorrectedDelivery({
      monograph: createMockFileDocument({ name: 'monografia', url: 'http://mono.com' }),
      annexes: createMockFileDocument({ name: 'anexos', url: 'http://anexos.com' })
    });

    it('getDeliveryDocumentNames debe extraer los nombres de los documentos adjuntos', () => {
      const names = service.getDeliveryDocumentNames(mockDelivery);
      expect(names).toEqual(['monografia', 'anexos']);
    });

    it('downloadDocumentByName debe llamar al servicio de descarga con el target correcto y la extensión PDF', async () => {
      await service.downloadDocumentByName(mockDelivery, 'monografia');

      expect(downloadSpy.download).toHaveBeenCalledWith('http://mono.com', 'monografia.pdf');
    });

    it('downloadDocumentByName debe mostrar notificación estricta de error si el documento no tiene URL', async () => {
      const badDelivery = createMockCorrectedDelivery();
      badDelivery.monograph!.url = '';

      await service.downloadDocumentByName(badDelivery, 'monografia');

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No existe un enlace de descarga válido para este archivo.',
        type: NotificationType.ERROR
      });
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });

    it('downloadDocumentByName debe registrar el error en consola y notificar si la descarga (API) falla', async () => {
      const mockError = new Error('Network timeout');
      downloadSpy.download.mockRejectedValue(mockError);

      await service.downloadDocumentByName(mockDelivery, 'monografia');

      expect(console.error).toHaveBeenCalledWith('Error al descargar el documento monografia:', mockError);

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No se pudo descargar monografia. Intente más tarde.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Manejo de Errores Genéricos', () => {
    it('showNavigationError debe mostrar la alerta de navegación', () => {
      service.showNavigationError();

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo identificar el código del trabajo de grado actual.',
        type: NotificationType.ERROR
      });
    });
  });
});
