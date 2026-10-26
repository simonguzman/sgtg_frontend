import { TestBed } from '@angular/core/testing';
import { StatisticsReportContext, StatisticsReportService } from './statistics-reports.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_STATISTICS_FILTERS, StatisticsFilters } from '../interfaces/statisticsFilters.interface';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { StatisticsReportKpis } from '../interfaces/statisticsReportKpis.interface';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

// Hacemos mock de las librerías externas para evitar renderizados reales
jest.mock('jspdf');
jest.mock('jspdf-autotable');

const createMockRawProjectData = (overrides: Partial<RawProjectData> = {}): RawProjectData => ({
  id: 'proj-123',
  title: 'Proyecto Mock',
  stage: ProjectStage.PROPUESTA,
  status: ProjectStatus.EN_DESARROLLO,
  originalState: 'EN_REVISION',
  period: '2026-1',
  directorId: 'usr-1',
  directorName: 'Director Mock',
  registrationDate: new Date(),
  isArchived: false,
  deadlineStatus: null,
  modality: 'Trabajo de investigación',
  program: 'Ingeniería de Sistemas',
  ...overrides
} as RawProjectData);

const context: StatisticsReportContext = { scope: 'Todos los trabajos de grado de la facultad.', directorName: null };

describe('StatisticsReportService', () => {
  let service: StatisticsReportService;

  // Objeto espía tipado para interceptar los llamados internos de jsPDF
  let mockJsPdfInstance: {
    setFontSize: jest.Mock;
    setTextColor: jest.Mock;
    text: jest.Mock;
    splitTextToSize: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockJsPdfInstance = {
      setFontSize: jest.fn(),
      setTextColor: jest.fn(),
      text: jest.fn(),
      splitTextToSize: jest.fn((texto: string) => [texto]),
      save: jest.fn(),
    };

    // El tipo de 'jsPDF' no se superpone con el de una función espía de Jest
    (jsPDF as unknown as jest.Mock).mockImplementation(() => mockJsPdfInstance);
    (autoTable as unknown as jest.Mock).mockClear();

    TestBed.configureTestingModule({
      providers: [StatisticsReportService]
    });

    service = TestBed.inject(StatisticsReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería inyectarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadPdfReport', () => {
    const mockKpis: StatisticsReportKpis = {
      loaded: 10,
      approved: 5,
      inProgress: 2,
      rejected: 3
    };

    const mockData: RawProjectData[] = [
      createMockRawProjectData({
        title: 'Proyecto de Prueba',
        stage: ProjectStage.PROPUESTA,
        status: ProjectStatus.EN_DESARROLLO,
        directorName: 'Juan Pérez',
        period: '2026-1',
        modality: 'Práctica profesional',
        program: 'Ingeniería Electrónica'
      })
    ];

    it('debería inicializar jsPDF y guardar el documento con la fecha actual', () => {
      service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
      expect(mockJsPdfInstance.save).toHaveBeenCalledWith(expect.stringContaining('Reporte_Academico_'));
      expect(mockJsPdfInstance.save).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
    });

    it('imprime el encabezado con el alcance y los KPIs', () => {
      service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Reporte de Control Académico', 14, 20);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith(expect.stringContaining('Generado el:'), 14, 28);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith(['Alcance: Todos los trabajos de grado de la facultad.'], 14, 34);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Resumen de Métricas:', 110, 46);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Trabajos registrados: 10', 110, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• En proceso: 2', 110, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Aprobados: 5', 110, 66);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• No aprobados o cancelados: 3', 110, 72);
    });

    it('escribe los filtros con textos legibles (etapa, director, modalidad, programa, estado y plazo)', () => {
      const filtros: StatisticsFilters = {
        stage: ProjectStage.TRABAJO_GRADO,
        period: '2025-2',
        directorId: 'dir-123',
        modality: 'Práctica profesional',
        program: 'Ingeniería Electrónica',
        archiveStatus: 'ARCHIVED',
        deadlineFilter: EvaluationDeadlineStatus.DELAYED
      };

      service.downloadPdfReport(filtros, mockData, mockKpis, { ...context, directorName: 'Ana Gómez' });

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Filtros Aplicados:', 14, 46);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Etapa: Trabajo de Grado', 14, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Periodo: 2025-2', 14, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Director: Ana Gómez', 14, 66);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Modalidad: Práctica profesional', 14, 72);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Programa: Ingeniería Electrónica', 14, 78);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Registros: Cerrados (historial)', 14, 84);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Plazo: Evaluado con retraso', 14, 90);
    });

    it('usa textos por defecto cuando no hay filtros aplicados', () => {
      service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Etapa: Todas las etapas', 14, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Periodo: Todos los periodos', 14, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Director: Todos los directores', 14, 66);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Modalidad: Todas las modalidades', 14, 72);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Programa: Todos los programas', 14, 78);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Registros: Todos', 14, 84);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Plazo: Todos los plazos', 14, 90);
    });

    it('arma la tabla con la modalidad, el programa y la etapa y el estado legibles', () => {
      service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

      expect(autoTable).toHaveBeenCalled();
      const [documento, tabla] = (autoTable as unknown as jest.Mock).mock.calls[0];
      expect(documento).toBe(mockJsPdfInstance);
      expect(tabla.startY).toBe(98);
      expect(tabla.head).toEqual([['#', 'Título del trabajo', 'Modalidad', 'Programa', 'Etapa', 'Estado', 'Director', 'Periodo']]);
      expect(tabla.body).toEqual([
        ['1', 'Proyecto de Prueba', 'Práctica profesional', 'Ingeniería Electrónica', 'Propuesta',
          'En desarrollo', 'Juan Pérez', '2026-1']
      ]);
    });
  });
});
