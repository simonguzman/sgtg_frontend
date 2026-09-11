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

// Importación para espiar utilidades externas
import * as fileReaderUtils from '../../../../../core/utils/file-reader.utils';

describe('LoadedProposalsFacadeService', () => {
  let service: LoadedProposalsFacadeService;

  let mockProposalService: jest.Mocked<ProposalService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockDownloadService: jest.Mocked<FileDownloadService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockMapper: jest.Mocked<LoadedProposalsMapperService>;

  let mockCurrentUserSignal: WritableSignal<User | null>;
  let mockAllProposalsSignal: WritableSignal<Proposal[]>;

  // Spies para utilidades y consola
  let readFileSpy: jest.SpyInstance;
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
    type: DocumentType.PROPUESTA,
    status: stateList.EN_REVISION,
    uploadDate: '01 - 01 - 2026',
    url: 'http://docs.com/doc1',
    allowedActions: []
  };

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
    // Silenciamos la consola para evitar ruido en los tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockCurrentUserSignal = signal<User | null>(mockUser);
    mockAllProposalsSignal = signal<Proposal[]>([mockProposal]);

    mockProposalService = {
      allProposals: mockAllProposalsSignal,
      uploadCorrectionMock: jest.fn()
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
      mapDocumentToRow: jest.fn().mockReturnValue(mockMappedRow)
    } as unknown as jest.Mocked<LoadedProposalsMapperService>;

    // Espiar la utilidad de lectura de archivos
    readFileSpy = jest.spyOn(fileReaderUtils, 'readFileAsDataUrl').mockResolvedValue('data:application/pdf;base64,mockedbase64');

    TestBed.configureTestingModule({
      providers: [
        LoadedProposalsFacadeService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoadedProposalsMapperService, useValue: mockMapper }
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

    it('debería mapear los documentos usando el mapper con permisos correctos (COMITE)', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true);

      const result = service.buildDocumentsTableData('prop-1');

      expect(mockAuthService.hasAnyRole).toHaveBeenCalledWith([UserRoleType.COMITE, UserRoleType.ADMINISTRADOR]);
      expect(mockMapper.mapDocumentToRow).toHaveBeenCalledWith(mockDocument, true, false);
      expect(result).toEqual([mockMappedRow]);
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
      mockMapper.mapDocumentToRow.mockReturnValue({ ...mockMappedRow, status: stateList.NO_APROBADO });

      const buttons = service.buildHeaderButtons('prop-1');

      expect(buttons[0].disabled).toBe(false);
    });

    it('debería retornar botón deshabilitado si la propuesta está APROBADA (totalmente)', () => {
      mockMapper.mapDocumentToRow.mockReturnValue({ ...mockMappedRow, status: stateList.APROBADO });
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
      await service.handleDownload(mockMappedRow);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO, title: 'Descarga iniciada' })
      );
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://docs.com/doc1', 'Propuesta.pdf');
    });

    it('debería notificar error si el URL es nulo o vacío', async () => {
      const invalidRow = { ...mockMappedRow, url: '   ' };
      await service.handleDownload(invalidRow);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Archivo no disponible' })
      );
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería interceptar errores lanzados por el servicio de descargas', async () => {
      mockDownloadService.download.mockRejectedValue(new Error('Network error'));

      await service.handleDownload(mockMappedRow);

      expect(consoleErrorSpy).toHaveBeenCalled(); // Se usa el espía global
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de descarga' })
      );
    });
  });

  describe('Método: upload', () => {
    const fileData = { fileName: 'correccion_final.pdf', file: new File([], 'test.pdf') };

    it('debería procesar la carga exitosamente tras leer el archivo, notificar y llamar a onSuccess', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockProposalService.uploadCorrectionMock.mockReturnValue(of(mockProposal));

      await service.upload('prop-1', fileData, onSuccess, onError);

      expect(readFileSpy).toHaveBeenCalledWith(fileData.file);
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Subiendo documento' }));
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: '¡Documento cargado!' }));

      expect(mockProposalService.uploadCorrectionMock).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({
          id: 'uuid-1234',
          name: 'correccion_final',
          type: DocumentType.CORRECCION,
          status: stateList.EN_REVISION,
          url: 'data:application/pdf;base64,mockedbase64',
          uploadDate: expect.any(String)
        })
      );

      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('debería fallar, notificar error y llamar onError si falla la lectura del archivo (Data URL)', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Forzamos error en la utilidad de FileReader
      readFileSpy.mockRejectedValue(new Error('FileReader Error'));

      await service.upload('prop-1', fileData, onSuccess, onError);

      expect(consoleErrorSpy).toHaveBeenCalled(); // Se usa el espía global
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de carga' }));
      expect(mockProposalService.uploadCorrectionMock).not.toHaveBeenCalled();

      expect(onError).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('debería notificar error y llamar a onError si falla el servicio de propuesta', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockProposalService.uploadCorrectionMock.mockReturnValue(throwError(() => new Error('Upload failed')));

      await service.upload('prop-1', fileData, onSuccess, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de carga', type: NotificationType.ERROR }));
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
