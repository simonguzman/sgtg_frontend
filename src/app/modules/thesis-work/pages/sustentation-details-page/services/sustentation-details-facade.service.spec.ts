// 1. Angular y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

// 2. Servicio a probar
import { SustentationDetailsFacadeService } from './sustentation-details-facade.service';

// 3. Dependencias
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { SustentationDetailsMapperService } from './sustentation-details-mapper.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationDetailsView } from '../models/sustentation-details.model';
import { stateList } from '../../../../../core/enums/state.enum';

// ── Interfaces Estrictas para Spies ──────────────────────────────────────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock;
}

interface MockSustentationDetailsMapperService {
  mapToView: jest.Mock;
}

interface MockFileDownloadService {
  download: jest.Mock;
}

interface MockNotificationService {
  show: jest.Mock;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'tw-1',
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
  preliminaryDraftData: {} as any, // Irrelevante para el alcance del Facade de detalles
  ...overrides
});

const createMockSustentationDetailsView = (overrides: Partial<SustentationDetailsView> = {}): SustentationDetailsView => ({
  title: 'Título de la Tesis',
  description: 'Descripción base',
  modality: 'Trabajo de Investigación',
  state: 'Programada',
  authors: 'Juan Perez',
  director: 'Dra. Maria',
  codirector: undefined,
  advisor: undefined,
  assignedJurors: 'Dr. Pedro, Dra. Ana',
  sustentationDate: new Date(),
  location: 'Auditorio Principal',
  administrativeStatus: 'Programada',
  isAdministrativelyPostponed: false,
  isAdministrativelyCanceled: false,
  postponementReason: null,
  approvedSpecialRequests: [],
  monograph: null,
  annexes: null,
  formatEDocument: null,
  verdicts: [],
  showCorrectedDocumentsButton: false,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('SustentationDetailsFacadeService', () => {
  let service: SustentationDetailsFacadeService;

  let thesisWorkSpy: MockThesisWorkService;
  let mapperSpy: MockSustentationDetailsMapperService;
  let downloadSpy: MockFileDownloadService;
  let notificationSpy: MockNotificationService;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkSpy = { getThesisWorkByIdMock: jest.fn() };
    mapperSpy = { mapToView: jest.fn() };
    downloadSpy = { download: jest.fn() };
    notificationSpy = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        SustentationDetailsFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkSpy },
        { provide: SustentationDetailsMapperService, useValue: mapperSpy },
        { provide: FileDownloadService, useValue: downloadSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(SustentationDetailsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar la consola
  });

  describe('loadDetails', () => {
    const thesisId = 'tw-1';
    const sustentationId = 's-1';

    it('debe cargar y mapear los detalles exitosamente', () => {
      const mockThesisWork = createMockThesisWork({ thesisWorkId: thesisId });
      const mockView = createMockSustentationDetailsView({ title: 'Test Sustentation' });

      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      mapperSpy.mapToView.mockReturnValue(mockView);

      service.loadDetails(thesisId, sustentationId);

      expect(thesisWorkSpy.getThesisWorkByIdMock).toHaveBeenCalledWith(thesisId);
      expect(mapperSpy.mapToView).toHaveBeenCalledWith(mockThesisWork, sustentationId);
      expect(service.viewData()).toEqual(mockView);
      expect(service.isLoading()).toBe(false);
    });

    it('debe mostrar error si el trabajo se encuentra pero la sustentación no (mapper retorna null)', () => {
      const mockThesisWork = createMockThesisWork();

      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      mapperSpy.mapToView.mockReturnValue(null); // Simulamos que no encontró la sustentación

      service.loadDetails(thesisId, sustentationId);

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'Sustentación no encontrada en el registro.',
        type: NotificationType.ERROR
      });
      expect(service.viewData()).toBeNull();
      expect(service.isLoading()).toBe(false);
    });

    it('debe mostrar error si el trabajo no se encuentra en el backend (retorna null/undefined)', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(null));

      service.loadDetails(thesisId, sustentationId);

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'Trabajo no registrado.',
        type: NotificationType.ERROR
      });

      expect(service.isLoading()).toBe(false);
      expect(mapperSpy.mapToView).not.toHaveBeenCalled();
    });

    it('debe manejar errores de comunicación (catch error del observable)', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Network error')));

      service.loadDetails(thesisId, sustentationId);

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Error de comunicación.',
        type: NotificationType.ERROR
      });

      expect(service.isLoading()).toBe(false);
      expect(service.viewData()).toBeNull(); // Se mantiene nulo si falla
    });
  });

  describe('downloadDocument', () => {
    it('debe llamar al servicio de descarga con nombre por defecto ("documento") si no se provee', () => {
      service.downloadDocument('http://test.com/doc.pdf');

      expect(downloadSpy.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'documento');
    });

    it('debe llamar al servicio de descarga con el nombre proveído', () => {
      service.downloadDocument('http://test.com/doc.pdf', 'mi-archivo.pdf');

      expect(downloadSpy.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'mi-archivo.pdf');
    });

    it('debe abortar la descarga y mostrar notificación de error si no hay url', () => {
      service.downloadDocument(undefined);

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        message: 'Documento no encontrado o ruta inválida.',
        type: NotificationType.ERROR
      }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });
  });
});
