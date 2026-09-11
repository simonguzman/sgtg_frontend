import { TestBed } from '@angular/core/testing';
import { StatisticsReportService } from './statistics-reports.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StatisticsFilters } from '../interfaces/statisticsFilters.interface';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { StatisticsReportKpis } from '../interfaces/statisticsReportKpis.interface';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';

// Hacemos mock de las librerías externas para evitar renderizados reales
jest.mock('jspdf');
jest.mock('jspdf-autotable');

// ── Funciones Fábrica fuertemente tipadas (Zero 'any') ────────────────────────

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
  ...overrides
} as RawProjectData);

const createMockStatisticsFilters = (overrides: Partial<StatisticsFilters> = {}): StatisticsFilters => ({
  stage: null,
  period: '',
  directorId: '',
  archiveStatus: 'ALL',
  ...overrides
} as StatisticsFilters);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('StatisticsReportService', () => {
  let service: StatisticsReportService;

  // Objeto espía tipado para interceptar los llamados internos de jsPDF
  let mockJsPdfInstance: {
    setFontSize: jest.Mock;
    setTextColor: jest.Mock;
    text: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Definimos los métodos espía para el documento PDF virtual
    mockJsPdfInstance = {
      setFontSize: jest.fn(),
      setTextColor: jest.fn(),
      text: jest.fn(),
      save: jest.fn(),
    };

    // FIX: Cuando mockeamos clases de librerías externas, TypeScript obliga
    // a usar 'unknown' porque el tipo nativo de 'jsPDF' no se superpone
    // en absoluto con el tipo de una función espía de Jest.
    (jsPDF as unknown as jest.Mock).mockImplementation(() => mockJsPdfInstance);

    // Limpiamos el mock de la tabla antes de cada test
    (autoTable as unknown as jest.Mock).mockClear();

    TestBed.configureTestingModule({
      providers: [StatisticsReportService]
    });

    service = TestBed.inject(StatisticsReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
  });

  it('debería inyectarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadPdfReport', () => {
    const mockKpis: StatisticsReportKpis = {
      loaded: 10,
      approved: 5,
      obs: 2,
      rejected: 3
    };

    // Usamos el Factory puro para los datos
    const mockData: RawProjectData[] = [
      createMockRawProjectData({
        title: 'Proyecto de Prueba',
        stage: ProjectStage.PROPUESTA,
        status: ProjectStatus.EN_DESARROLLO,
        directorName: 'Juan Pérez',
        period: '2026-1'
      })
    ];

    it('debería inicializar jsPDF y guardar el documento con la fecha actual', () => {
      const mockFilters = createMockStatisticsFilters();

      service.downloadPdfReport(mockFilters, mockData, mockKpis);

      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
      // Verificamos que contenga el prefijo y termine en .pdf
      expect(mockJsPdfInstance.save).toHaveBeenCalledWith(expect.stringContaining('Reporte_Academico_'));
      expect(mockJsPdfInstance.save).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
    });

    it('debería imprimir el header y los KPIs correctamente', () => {
      const mockFilters = createMockStatisticsFilters();

      service.downloadPdfReport(mockFilters, mockData, mockKpis);

      // Verificación de Header (Título principal)
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Reporte de Control Académico', 14, 20);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith(expect.stringContaining('Generado el:'), 14, 28);

      // Verificación de KPIs
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Resumen de Métricas:', 100, 40);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Proyectos Totales: 10', 100, 48);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Aprobados: 5', 100, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Aprobados c/Obs: 2', 100, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• No Aprobados/Cancelados: 3', 100, 66);
    });

    it('debería formatear correctamente los textos de la sección de filtros', () => {
      // FIX: Configuramos filtros específicos usando los Enums correctos
      const mockFilters = createMockStatisticsFilters({
        stage: ProjectStage.TRABAJO_GRADO,
        period: '2025-2',
        directorId: 'dir-123',
        archiveStatus: 'ARCHIVED',
      });

      service.downloadPdfReport(mockFilters, mockData, mockKpis);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Filtros Aplicados:', 14, 40);
      // Usamos template literal con el Enum para que haga match dinámicamente
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith(`• Etapa: ${ProjectStage.TRABAJO_GRADO}`, 14, 48);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Periodo: 2025-2', 14, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Director: Director Específico', 14, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Registros: Historial (Archivados)', 14, 66);
    });

    it('debería usar textos por defecto cuando no hay filtros aplicados', () => {
      // Filtros vacíos o no definidos explícitamente con null
      const mockFilters = createMockStatisticsFilters({
        stage: null,
        period: '',
        directorId: '',
        archiveStatus: 'ALL'
      });

      service.downloadPdfReport(mockFilters, mockData, mockKpis);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Etapa: Todas las etapas', 14, 48);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Periodo: Todos los periodos', 14, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Director: Todos los directores', 14, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Registros: Todos', 14, 66);
    });

    it('debería configurar autoTable mapeando correctamente la data cruda', () => {
      const mockFilters = createMockStatisticsFilters();

      service.downloadPdfReport(mockFilters, mockData, mockKpis);

      // Verificamos que se haya llamado la función exportada por defecto de jspdf-autotable
      expect(autoTable).toHaveBeenCalled();

      // Obtenemos los argumentos con los que se llamó a autoTable
      const autoTableArgs = (autoTable as unknown as jest.Mock).mock.calls[0];

      // El primer argumento es la instancia del doc
      expect(autoTableArgs[0]).toBe(mockJsPdfInstance);

      // El segundo argumento es la configuración de la tabla
      const tableConfig = autoTableArgs[1];
      expect(tableConfig.startY).toBe(75);

      // Aseguramos que la data cruda se transformó usando directamente los enums subyacentes
      expect(tableConfig.body).toEqual([
        ['1', 'Proyecto de Prueba', ProjectStage.PROPUESTA, ProjectStatus.EN_DESARROLLO, 'Juan Pérez', '2026-1']
      ]);
    });
  });
});
