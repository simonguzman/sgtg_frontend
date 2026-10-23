import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import { LoadedProposalsFacadeService } from './loaded-proposals-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { LoadedProposalsMapperService } from './loaded-proposals-mapper.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { DocumentTableRow } from '../models/loaded-proposals-page.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { Proposal } from '../../../interfaces/proposal.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../../users/services/user.service';
import { Modality } from '../../../enums/modality.enum';

describe('LoadedProposalsFacadeService', () => {
  let service: LoadedProposalsFacadeService;
  let mockProposalService: jest.Mocked<ProposalService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockDownloadService: jest.Mocked<FileDownloadService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockMapper: jest.Mocked<LoadedProposalsMapperService>;
  let mockCurrentUserSignal: WritableSignal<User | null>;
  let mockAllProposalsSignal: WritableSignal<Proposal[]>;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  const mockUser: User = { id: 'user-director', roles: [UserRoleType.DOCENTE] } as User;
  const mockDocument: FileDocument = {
    id: 'doc-1',
    name: 'Propuesta',
    url: 'http://docs.com/doc1',
    type: DocumentType.PROPUESTA,
    status: stateList.EN_REVISION,
    uploadDate: '2026-01-01'
  };
  const mockProposal: Proposal = {
    id: 'prop-1',
    state: stateList.EN_REVISION,
    director: { id: 'user-director' },
    isArchived: false,
    documents: [mockDocument]
  } as Proposal;
  const mockMappedRow: DocumentTableRow = {
    id: 'doc-1',
    name: 'Propuesta',
    status: stateList.EN_REVISION,
    version: 1,
    uploadDate: '01 - 01 - 2026',
    documents: [mockDocument],
    allowedActions: []
  };
  let mockUserService: { getAuthorsNames: jest.Mock; formatFullName: jest.Mock };

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'uuid-1234' }
    });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21T10:00:00Z').getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockCurrentUserSignal = signal<User | null>(mockUser);
    mockAllProposalsSignal = signal<Proposal[]>([mockProposal]);
    mockProposalService = {
      allProposals: mockAllProposalsSignal,
      uploadCorrection: jest.fn()
    } as unknown as jest.Mocked<ProposalService>;
    mockAuthService = {
      currentUser: mockCurrentUserSignal,
      hasAnyRole: jest.fn().mockReturnValue(false)
    } as unknown as jest.Mocked<AuthService>;
    mockDownloadService = {
      download: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<FileDownloadService>;
    mockNotificationService = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;
    mockMapper = {
      mapRegistrationToRow: jest.fn().mockReturnValue(mockMappedRow)
    } as unknown as jest.Mocked<LoadedProposalsMapperService>;
    mockUserService = {
      getAuthorsNames: jest.fn(() => 'Ana Estudiante'),
      formatFullName: jest.fn((user: User) => `Nombre ${user.id}`)
    };
    TestBed.configureTestingModule({
      providers: [
        LoadedProposalsFacadeService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoadedProposalsMapperService, useValue: mockMapper },
        { provide: UserService, useValue: mockUserService }
      ]
    });
    service = TestBed.inject(LoadedProposalsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Método: buildDocumentsTableData', () => {
    it('debería retornar un arreglo vacío si no hay propuesta o usuario', () => {
      expect(service.buildDocumentsTableData(null)).toEqual([]);
      mockCurrentUserSignal.set(null);
      expect(service.buildDocumentsTableData('prop-1')).toEqual([]);
    });

    it('debería mapear cada versión como un registro con los permisos correctos (COMITE)', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true);
      const result = service.buildDocumentsTableData('prop-1');
      expect(mockAuthService.hasAnyRole).toHaveBeenCalledWith([UserRoleType.COMITE, UserRoleType.ADMINISTRADOR]);
      expect(mockMapper.mapRegistrationToRow).toHaveBeenCalledWith(mockDocument, [], true, true, false);
      expect(result).toEqual([mockMappedRow]);
    });

    it('agrupa la carta con la primera versión y lista los registros del más reciente al más antiguo', () => {
      const v1 = { ...mockDocument, id: 'v1', type: DocumentType.PROPUESTA, version: 1, status: stateList.NO_APROBADO };
      const v2 = { ...mockDocument, id: 'v2', type: DocumentType.PROPUESTA, version: 2, status: stateList.EN_REVISION };
      const carta = { ...mockDocument, id: 'carta', type: DocumentType.FORMATO, version: 1, status: undefined };
      mockAllProposalsSignal.set([{ ...mockProposal, documents: [v1, carta, v2] }]);
      mockMapper.mapRegistrationToRow.mockImplementation((principal: FileDocument) => ({ ...mockMappedRow, id: principal.id }));

      const result = service.buildDocumentsTableData('prop-1');

      expect(mockMapper.mapRegistrationToRow).toHaveBeenCalledWith(v1, [carta], true, false, false);
      expect(mockMapper.mapRegistrationToRow).toHaveBeenCalledWith(v2, [], true, false, false);
      expect(result.map(row => row.id)).toEqual(['v2', 'v1']);
    });

    it('sin versiones radicadas muestra los demás documentos como un registro', () => {
      const carta = { ...mockDocument, id: 'carta', type: DocumentType.FORMATO, status: undefined };
      mockAllProposalsSignal.set([{ ...mockProposal, documents: [carta] }]);
      service.buildDocumentsTableData('prop-1');
      expect(mockMapper.mapRegistrationToRow).toHaveBeenCalledWith(carta, [], false, false, false);
    });
  });

  describe('Método: buildRegistrationDetails', () => {
    const propuesta = {
      ...mockProposal,
      title: 'Sistema de gestión',
      description: 'Contexto del trabajo',
      objectives: ['General', 'Específico 1', 'Específico 2'],
      lineOfResearch: 'Ingeniería de software',
      organization: 'Empresa S.A.',
      modality: Modality.PP,
      authors: [{ id: 'est-1' }],
      director: { id: 'dir-1' },
      advisor: { id: 'ase-1' }
    } as Proposal;

    it('sin propuesta o sin registro no hay detalle', () => {
      expect(service.buildRegistrationDetails('prop-1', null)).toBeNull();
      expect(service.buildRegistrationDetails('no-existe', mockMappedRow)).toBeNull();
    });

    it('arma la información de la propuesta y los documentos del registro', () => {
      mockAllProposalsSignal.set([propuesta]);
      const detalle = service.buildRegistrationDetails('prop-1', mockMappedRow)!;

      expect(detalle).toEqual(expect.objectContaining({
        subtitle: 'Registro de la propuesta',
        title: 'Sistema de gestión',
        modality: Modality.PP,
        student: 'Ana Estudiante',
        director: 'Nombre dir-1',
        codirector: undefined,
        adviser: 'Nombre ase-1',
        state: stateList.EN_REVISION,
        documents: [mockDocument]
      }));
      expect(detalle.chargeDate).toEqual(new Date('2026-01-01'));
      expect(detalle.comments).toBe('Contexto del trabajo\n\nObjetivo general: General\n\n'
        + 'Objetivos específicos:\n• Específico 1\n• Específico 2\n\n'
        + 'Línea de investigación: Ingeniería de software\n\nOrganización: Empresa S.A.');
    });

    it('una versión posterior se presenta como corrección', () => {
      mockAllProposalsSignal.set([propuesta]);
      expect(service.buildRegistrationDetails('prop-1', { ...mockMappedRow, version: 3 })?.subtitle)
        .toBe('Corrección de la propuesta – versión 3');
    });
  });

  describe('Método: downloadRegistrationDocument', () => {
    it('descarga el documento del registro por su nombre', async () => {
      await service.downloadRegistrationDocument('Propuesta', mockMappedRow);
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://docs.com/doc1', 'Propuesta.pdf');
    });

    it('avisa si el documento no está en el registro', async () => {
      await service.downloadRegistrationDocument('Otro', mockMappedRow);
      expect(mockDownloadService.download).not.toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Archivo no disponible' }));
    });
  });

  describe('Método: buildHeaderButtons', () => {
    it('debería retornar vacío si la propuesta está archivada', () => {
      mockAllProposalsSignal.set([{ ...mockProposal, isArchived: true } as Proposal]);
      expect(service.buildHeaderButtons('prop-1')).toEqual([]);
    });

    it('debería retornar vacío si el usuario no es director ni admin', () => {
      mockCurrentUserSignal.set({ id: 'user-other', roles: [UserRoleType.DOCENTE] } as User);
      mockAuthService.hasAnyRole.mockReturnValue(false);
      expect(service.buildHeaderButtons('prop-1')).toEqual([]);
    });

    it('debería retornar botón deshabilitado si hay un documento en revisión', () => {
      const buttons = service.buildHeaderButtons('prop-1');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toEqual({
        action: 'upload_correction',
        label: 'Cargar propuesta corregida',
        variant: 'primary',
        disabled: true
      });
    });

    it('debería retornar botón habilitado si no hay docs en revisión y no está totalmente aprobada', () => {
      mockMapper.mapRegistrationToRow.mockReturnValue({ ...mockMappedRow, status: stateList.NO_APROBADO });
      const buttons = service.buildHeaderButtons('prop-1');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debería retornar botón deshabilitado si la propuesta está APROBADA (totalmente)', () => {
      mockMapper.mapRegistrationToRow.mockReturnValue({ ...mockMappedRow, status: stateList.APROBADO });
      mockAllProposalsSignal.set([{ ...mockProposal, state: stateList.APROBADO } as Proposal]);
      const buttons = service.buildHeaderButtons('prop-1');
      expect(buttons[0].disabled).toBe(true);
    });
  });

  describe('Método: canUpload', () => {
    it('debería retornar true si es el director de la propuesta', () => {
      expect(service.canUpload('prop-1')).toBe(true);
    });

    it('debería retornar true si es ADMINISTRADOR (aunque no sea director)', () => {
      mockCurrentUserSignal.set({ id: 'user-other', roles: [UserRoleType.ADMINISTRADOR] } as User);
      mockAuthService.hasAnyRole.mockImplementation((roles) => roles.includes(UserRoleType.ADMINISTRADOR));
      expect(service.canUpload('prop-1')).toBe(true);
    });

    it('debería retornar false y notificar error si no es director ni administrador', () => {
      mockCurrentUserSignal.set({ id: 'user-other', roles: [UserRoleType.DOCENTE] } as User);
      mockAuthService.hasAnyRole.mockReturnValue(false);
      const result = service.canUpload('prop-1');
      expect(result).toBe(false);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Acceso denegado' })
      );
    });
  });

  describe('Método: showRestrictedActionNotification', () => {
    it('debería mostrar la notificación estándar de acción denegada', () => {
      service.showRestrictedActionNotification();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Acción no permitida',
          type: NotificationType.ERROR
        })
      );
    });
  });

  describe('Método: handleDownload', () => {
    it('debería notificar info e iniciar descarga si el URL es válido de forma asíncrona', async () => {
      await service.handleDownload(mockDocument);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO, title: 'Descarga iniciada' })
      );
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://docs.com/doc1', 'Propuesta.pdf');
    });

    it('debería notificar error si el URL es nulo o vacío', async () => {
      await service.handleDownload({ ...mockDocument, url: '   ' });
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Archivo no disponible' })
      );
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería interceptar errores lanzados por el servicio de descargas', async () => {
      mockDownloadService.download.mockRejectedValue(new Error('Network error'));
      await service.handleDownload(mockDocument);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de descarga' })
      );
    });
  });

  describe('Método: upload', () => {
    const fileData = { fileName: 'correccion_final.pdf', file: new File([], 'test.pdf') };

    it('debería radicar la nueva versión, notificar y llamar a onSuccess', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      mockProposalService.uploadCorrection.mockReturnValue(of(mockProposal));
      await service.upload('prop-1', fileData, onSuccess, onError);
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Subiendo documento' }));
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: '¡Documento cargado!' }));
      expect(mockProposalService.uploadCorrection).toHaveBeenCalledWith('prop-1', fileData.file);
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('debería mostrar el mensaje del backend y llamar a onError si falla', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      mockProposalService.uploadCorrection.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 400, error: { message: 'Solo se radica tras un NO APROBADO.' } })));
      await service.upload('prop-1', fileData, onSuccess, onError);
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de carga', message: 'Solo se radica tras un NO APROBADO.', type: NotificationType.ERROR
      }));
      expect(onError).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Método: findProposal', () => {
    it('debería retornar undefined si se pasa un id nulo', () => {
      expect(service.findProposal(null)).toBeUndefined();
    });

    it('debería retornar la propuesta correcta si se encuentra en los signals', () => {
      expect(service.findProposal('prop-1')).toEqual(mockProposal);
    });

    it('debería retornar undefined si la propuesta no existe', () => {
      expect(service.findProposal('prop-desconocida')).toBeUndefined();
    });
  });
});
