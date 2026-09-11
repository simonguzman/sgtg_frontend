import { TestBed } from '@angular/core/testing';
import { EvaluationsFacadeService } from './evaluations-facade.service';
import { EvaluationsMapperService } from './evaluations-mapper.service';
import { ProposalService } from '../../../../modules/proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../../modules/preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../../modules/thesis-work/services/thesis-work.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';
import { EvaluationTableRow } from '../models/evaluations-page.model';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { stateList } from '../../../../core/enums/state.enum';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockEvaluationTableRow = (overrides: Partial<EvaluationTableRow> = {}): EvaluationTableRow => ({
  id: 'eval-1',
  evaluatorId: 'user-1',
  evaluatorName: 'Test Evaluator', // FIX: Nombre correcto de la propiedad
  evaluatorRole: 'Jurado',         // FIX: Nombre correcto de la propiedad
  documentTargetName: 'Documento de prueba',
  veredict: stateList.EVALUADO,    // FIX: La propiedad es 'veredict', no 'state'
  observations: 'Sin observaciones',
  date: new Date('2023-01-01T10:00:00Z'),
  signedDocuments: [],
  allowedActions: ['view_details'],
  ...overrides
});

const createMockFormattedDocument = (overrides: Partial<FormattedDocument> = {}): FormattedDocument => ({
  name: 'archivo-default.pdf',
  url: 'http://localhost/archivo-default.pdf',
  size: 1024,
  ...overrides
} as FormattedDocument);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluationsFacadeService', () => {
  let service: EvaluationsFacadeService;

  // Tipado estricto de los servicios simulados
  let mockMapperService: {
    processProposalEvaluations: jest.Mock<EvaluationTableRow[], [{ id: string }]>;
    processDraftEvaluations: jest.Mock<EvaluationTableRow[], [{ preliminaryDraftId: string }]>;
    processThesisEvaluations: jest.Mock<EvaluationTableRow[], [{ thesisWorkId: string }]>;
  };

  let mockProposalService: {
    allProposals: jest.Mock<Array<{ id: string }>, []>;
  };

  let mockPreliminaryDraftService: {
    allPreliminaryDrafts: jest.Mock<Array<{ preliminaryDraftId: string }>, []>;
  };

  let mockThesisWorkService: {
    allThesisWorks: jest.Mock<Array<{ thesisWorkId: string }>, []>;
  };

  let mockDownloadService: {
    download: jest.Mock<Promise<void>, [string, string]>;
  };

  let mockNotificationService: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia ante errores de descarga esperados
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockMapperService = {
      processProposalEvaluations: jest.fn(),
      processDraftEvaluations: jest.fn(),
      processThesisEvaluations: jest.fn(),
    };

    mockProposalService = { allProposals: jest.fn().mockReturnValue([]) };
    mockPreliminaryDraftService = { allPreliminaryDrafts: jest.fn().mockReturnValue([]) };
    mockThesisWorkService = { allThesisWorks: jest.fn().mockReturnValue([]) };

    mockDownloadService = { download: jest.fn() };
    mockNotificationService = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        EvaluationsFacadeService,
        { provide: EvaluationsMapperService, useValue: mockMapperService },
        { provide: ProposalService, useValue: mockProposalService },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: ThesisWorkService, useValue: mockThesisWorkService },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });

    service = TestBed.inject(EvaluationsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías
  });

  describe('getMappedEvaluations()', () => {

    // FIX: Cambiamos 'state' por 'veredict'
    const mockUnsortedEvaluations: EvaluationTableRow[] = [
      createMockEvaluationTableRow({ date: new Date('2023-01-01T10:00:00Z'), veredict: stateList.EVALUADO }),
      createMockEvaluationTableRow({ date: new Date('2023-05-01T10:00:00Z'), veredict: stateList.APROBADO }),
      createMockEvaluationTableRow({ date: new Date('2023-03-01T10:00:00Z'), veredict: stateList.EN_REVISION }),
    ];

    it('debería mapear y ordenar evaluaciones de PROPUESTAS si la url contiene "proposal"', () => {
      const mockProposal = { id: 'prop-1' };
      mockProposalService.allProposals.mockReturnValue([mockProposal]);
      mockMapperService.processProposalEvaluations.mockReturnValue([...mockUnsortedEvaluations]);

      const result = service.getMappedEvaluations('prop-1', '/history/proposal/prop-1');

      expect(mockMapperService.processProposalEvaluations).toHaveBeenCalledWith(mockProposal);
      expect(result[0].date).toEqual(new Date('2023-05-01T10:00:00Z')); // El más reciente primero
      expect(result[2].date).toEqual(new Date('2023-01-01T10:00:00Z')); // El más antiguo último
    });

    it('debería mapear y ordenar evaluaciones de ANTEPROYECTOS si la url contiene "preliminary-draft"', () => {
      const mockDraft = { preliminaryDraftId: 'draft-1' };
      mockPreliminaryDraftService.allPreliminaryDrafts.mockReturnValue([mockDraft]);
      mockMapperService.processDraftEvaluations.mockReturnValue([...mockUnsortedEvaluations]);

      const result = service.getMappedEvaluations('draft-1', '/history/preliminary-draft/draft-1');

      expect(mockMapperService.processDraftEvaluations).toHaveBeenCalledWith(mockDraft);
      expect(result.length).toBe(3);
      expect(result[0].date).toEqual(new Date('2023-05-01T10:00:00Z'));
    });

    it('debería mapear y ordenar evaluaciones de TRABAJOS DE GRADO si la url contiene "thesis"', () => {
      const mockThesis = { thesisWorkId: 'thesis-1' };
      mockThesisWorkService.allThesisWorks.mockReturnValue([mockThesis]);
      mockMapperService.processThesisEvaluations.mockReturnValue([...mockUnsortedEvaluations]);

      const result = service.getMappedEvaluations('thesis-1', '/history/thesis/thesis-1');

      expect(mockMapperService.processThesisEvaluations).toHaveBeenCalledWith(mockThesis);
      expect(result.length).toBe(3);
    });

    it('debería retornar un arreglo vacío si la URL no coincide con ninguna entidad', () => {
      const result = service.getMappedEvaluations('unknown-1', '/history/unknown/unknown-1');

      expect(result).toEqual([]);
      expect(mockMapperService.processProposalEvaluations).not.toHaveBeenCalled();
      expect(mockMapperService.processDraftEvaluations).not.toHaveBeenCalled();
      expect(mockMapperService.processThesisEvaluations).not.toHaveBeenCalled();
    });
  });

  describe('handleDownload()', () => {

    it('debería mostrar un error y no descargar si el documento no tiene URL', async () => {
      const invalidDoc = createMockFormattedDocument({ name: 'archivo.pdf', url: '   ' });

      await service.handleDownload(invalidDoc);

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'No se pudo localizar el documento.',
        type: NotificationType.ERROR
      });
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería mostrar notificación de inicio y procesar la descarga exitosamente', async () => {
      const validDoc = createMockFormattedDocument({ name: 'archivo.pdf', url: 'http://localhost/archivo.pdf' });
      mockDownloadService.download.mockResolvedValue(undefined);

      await service.handleDownload(validDoc);

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Descarga',
        message: 'Iniciando descarga...',
        type: NotificationType.INFO
      });
      expect(mockDownloadService.download).toHaveBeenCalledWith(validDoc.url, validDoc.name);
    });

    it('debería atrapar errores en la descarga y mostrar una notificación de error', async () => {
      const validDoc = createMockFormattedDocument({ name: 'archivo.pdf', url: 'http://localhost/archivo.pdf' });
      mockDownloadService.download.mockRejectedValue(new Error('Network error'));

      await service.handleDownload(validDoc);

      expect(mockDownloadService.download).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: `No se pudo descargar ${validDoc.name}. Intente más tarde.`,
        type: NotificationType.ERROR
      });
    });
  });
});
