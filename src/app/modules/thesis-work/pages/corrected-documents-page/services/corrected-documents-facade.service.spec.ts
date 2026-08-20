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
import { stateList } from '../../../../../core/enums/state.enum';

interface MockUser { id: string; name?: string }

// Tipo de utilidad para simular objetos complejos sin usar "any" y manteniendo la seguridad
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

describe('CorrectedDocumentsFacadeService', () => {
  let service: CorrectedDocumentsFacadeService;
  let authSpy: jest.Mocked<Partial<AuthService>>;
  let participantsSpy: jest.Mocked<ThesisParticipantsFormatterService>;
  let downloadSpy: jest.Mocked<FileDownloadService>;
  let notificationSpy: jest.Mocked<NotificationService>;
  let currentUserSignal: WritableSignal<MockUser | null>;

  beforeEach(() => {
    currentUserSignal = signal<MockUser | null>({ id: 'user-123' });

    authSpy = {
      currentUser: currentUserSignal
    } as unknown as jest.Mocked<Partial<AuthService>>;

    participantsSpy = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn()
    } as unknown as jest.Mocked<ThesisParticipantsFormatterService>;

    downloadSpy = { download: jest.fn() } as unknown as jest.Mocked<FileDownloadService>;
    notificationSpy = { show: jest.fn() } as unknown as jest.Mocked<NotificationService>;

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

  // LIMPIEZA: Esencial para evitar contaminación entre pruebas
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findThesisWork', () => {
    it('debe retornar null si no se provee un ID', () => {
      expect(service.findThesisWork(null, [])).toBeNull();
    });

    it('debe encontrar el trabajo de grado correcto', () => {
      const mockWorks = [{ thesisWorkId: 'tw-1' }, { thesisWorkId: 'tw-2' }] as unknown as ThesisWork[];
      expect(service.findThesisWork('tw-2', mockWorks)?.thesisWorkId).toBe('tw-2');
    });

    it('debe retornar null si no encuentra el trabajo', () => {
      const mockWorks = [{ thesisWorkId: 'tw-1' }] as unknown as ThesisWork[];
      expect(service.findThesisWork('tw-2', mockWorks)).toBeNull();
    });
  });

  describe('Validaciones de Roles (isDirector, isJuror)', () => {
    it('isDirector debe retornar true si el usuario actual es el director', () => {
      const thesis = {
        preliminaryDraftData: { proposalData: { director: { id: 'user-123' } } }
      } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.isDirector(thesis)).toBe(true);
    });

    it('isDirector debe retornar false si el usuario no es el director', () => {
      const thesis = {
        preliminaryDraftData: { proposalData: { director: { id: 'other-user' } } }
      } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.isDirector(thesis)).toBe(false);
    });

    it('isJuror debe retornar true si el usuario actual está en la lista de jurados de la primera sustentación', () => {
      const thesis = {
        sustentations: [{ assignedJurors: [{ id: 'user-abc' }, { id: 'user-123' }] }]
      } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.isJuror(thesis)).toBe(true);
    });

    it('isJuror debe retornar false si no hay sustentaciones o el usuario no está', () => {
      const thesis = { sustentations: [] } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.isJuror(thesis)).toBe(false);
    });
  });

  describe('Permisos (canDirectorUpload, canJurorEvaluate)', () => {
    it('canDirectorUpload debe retornar false si está archivado o no es director', () => {
      expect(service.canDirectorUpload(null, false, false)).toBe(false);
      expect(service.canDirectorUpload(null, true, true)).toBe(false);
    });

    it('canDirectorUpload debe retornar true si es director y no hay entregas previas', () => {
      const thesis = { correctedDeliveries: [] } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.canDirectorUpload(thesis, true, false)).toBe(true);
    });

    it('canDirectorUpload debe retornar true si la última entrega fue NO_APROBADO o APLAZADO', () => {
      const thesis = {
        correctedDeliveries: [{ status: stateList.NO_APROBADO }]
      } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.canDirectorUpload(thesis, true, false)).toBe(true);
    });

    it('canJurorEvaluate debe retornar true si es jurado y la última entrega está EN_REVISION', () => {
      const thesis = {
        correctedDeliveries: [{ status: stateList.EN_REVISION }]
      } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.canJurorEvaluate(thesis, true, false)).toBe(true);
    });
  });

  describe('buildTableData', () => {
    it('debe retornar un arreglo vacío si no hay entregas', () => {
      expect(service.buildTableData(null)).toEqual([]);
    });

    it('debe mapear correctamente las entregas a filas de la tabla', () => {
      const thesis = {
        correctedDeliveries: [
          { id: 'del-1', uploadDate: '2026-07-28', status: stateList.APROBADO }
        ]
      } as DeepPartial<ThesisWork> as ThesisWork;

      const result = service.buildTableData(thesis);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('del-1');
      expect(result[0].name).toBe('Paquete de Correcciones Radicado 1');
      expect(result[0].status).toBe(stateList.APROBADO);
    });
  });

  describe('Descarga de documentos', () => {
    // CORRECCIÓN: Nombres sin '.pdf' para que el assert funcione limpio con la lógica del Facade
    const mockDelivery = {
      monograph: { name: 'monografia', url: 'http://mono.com' },
      annexes: { name: 'anexos', url: 'http://anexos.com' }
    } as DeepPartial<CorrectedDelivery> as CorrectedDelivery;

    it('getDeliveryDocumentNames debe extraer los nombres de los documentos', () => {
      const names = service.getDeliveryDocumentNames(mockDelivery);
      expect(names).toEqual(['monografia', 'anexos']);
    });

    // CORRECCIÓN VITAL: Añadido async/await para manejar la promesa correctamente
    it('downloadDocumentByName debe llamar al servicio de descarga con el target correcto', async () => {
      await service.downloadDocumentByName(mockDelivery, 'monografia');
      expect(downloadSpy.download).toHaveBeenCalledWith('http://mono.com', 'monografia.pdf');
    });

    // CORRECCIÓN VITAL: Añadido async/await
    it('downloadDocumentByName debe mostrar error si el documento no tiene URL', async () => {
      const badDelivery = { monograph: { name: 'archivo' } } as DeepPartial<CorrectedDelivery> as CorrectedDelivery;

      await service.downloadDocumentByName(badDelivery, 'archivo');

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error de descarga'
      }));
    });
  });
});
