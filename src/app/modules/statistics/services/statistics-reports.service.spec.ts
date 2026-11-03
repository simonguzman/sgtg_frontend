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
// La librería de Excel se reemplaza: la prueba revisa las hojas que recibe
const mockWriteXlsxFile = jest.fn();
jest.mock('write-excel-file/browser', () => ({ __esModule: true, default: (...args: unknown[]) => mockWriteXlsxFile(...args) }));

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

    it('debería inicializar jsPDF y guardar el documento con la fecha actual', async () => {
      await service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
      expect(mockJsPdfInstance.save).toHaveBeenCalledWith(expect.stringContaining('Reporte_Academico_'));
      expect(mockJsPdfInstance.save).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
    });

    it('imprime el encabezado con el alcance y los KPIs', async () => {
      await service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Reporte de Control Académico', 14, 20);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith(expect.stringContaining('Generado el:'), 14, 28);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith(['Alcance: Todos los trabajos de grado de la facultad.'], 14, 34);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Resumen de Métricas:', 110, 46);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Trabajos registrados: 10', 110, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• En proceso: 2', 110, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Aprobados: 5', 110, 66);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• No aprobados o cancelados: 3', 110, 72);
    });

    it('escribe los filtros con textos legibles (etapa, director, modalidad, programa, estado y plazo)', async () => {
      const filtros: StatisticsFilters = {
        stage: ProjectStage.TRABAJO_GRADO,
        period: '2025-2',
        directorId: 'dir-123',
        modality: 'Práctica profesional',
        program: 'Ingeniería Electrónica',
        archiveStatus: 'ARCHIVED',
        deadlineFilter: EvaluationDeadlineStatus.DELAYED
      };

      await service.downloadPdfReport(filtros, mockData, mockKpis, { ...context, directorName: 'Ana Gómez' });

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('Filtros Aplicados:', 14, 46);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Etapa: Trabajo de Grado', 14, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Periodo: 2025-2', 14, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Director: Ana Gómez', 14, 66);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Modalidad: Práctica profesional', 14, 72);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Programa: Ingeniería Electrónica', 14, 78);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Registros: Cerrados (historial)', 14, 84);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Plazo: Evaluado con retraso', 14, 90);
    });

    it('usa textos por defecto cuando no hay filtros aplicados', async () => {
      await service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Etapa: Todas las etapas', 14, 54);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Periodo: Todos los periodos', 14, 60);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Director: Todos los directores', 14, 66);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Modalidad: Todas las modalidades', 14, 72);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Programa: Todos los programas', 14, 78);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Registros: Todos', 14, 84);
      expect(mockJsPdfInstance.text).toHaveBeenCalledWith('• Plazo: Todos los plazos', 14, 90);
    });

    it('arma la tabla con la modalidad, el programa y la etapa y el estado legibles', async () => {
      await service.downloadPdfReport({ ...DEFAULT_STATISTICS_FILTERS }, mockData, mockKpis, context);

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

  describe('Excel y CSV', () => {
    const kpis: StatisticsReportKpis = { loaded: 2, approved: 1, inProgress: 1, rejected: 0 };
    const datos: RawProjectData[] = [
      createMockRawProjectData({ title: 'Sistema; de "gestión"', directorName: 'Ana Gómez', period: '2026-1' }),
      createMockRawProjectData({ title: '=HIPERVINCULO("x")', directorName: 'Luis Mora', period: '2026-2' })
    ];
    let descargas: { nombre: string; blob: Blob }[];

    beforeEach(() => {
      descargas = [];
      let ultimo: Blob | undefined;
      // jsdom no implementa las URL de objetos: se guarda el archivo que se iba a descargar
      URL.createObjectURL = jest.fn((blob: Blob) => { ultimo = blob; return 'blob:prueba'; });
      URL.revokeObjectURL = jest.fn();
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        descargas.push({ nombre: this.download, blob: ultimo! });
      });
      mockWriteXlsxFile.mockReset();
      mockWriteXlsxFile.mockReturnValue({ toBlob: () => Promise.resolve(new Blob(['xlsx'])) });
    });

    const leer = (blob: Blob) => new Promise<string>(resolve => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result as string);
      lector.readAsText(blob, 'utf-8');
    });

    const bytes = (blob: Blob) => new Promise<Uint8Array>(resolve => {
      const lector = new FileReader();
      lector.onload = () => resolve(new Uint8Array(lector.result as ArrayBuffer));
      lector.readAsArrayBuffer(blob);
    });

    it('el Excel lleva la hoja de trabajos con encabezado fijo y la de resumen con filtros y métricas', async () => {
      await service.downloadExcelReport({ ...DEFAULT_STATISTICS_FILTERS, period: '2026-1' }, datos, kpis, context);

      const [hojas] = mockWriteXlsxFile.mock.calls[0];
      const [trabajos, resumen] = hojas;
      expect(trabajos.sheet).toBe('Trabajos');
      expect(trabajos.stickyRowsCount).toBe(1);
      expect(trabajos.data[0].map((celda: { value: string }) => celda.value)).toEqual(
        ['#', 'Título del trabajo', 'Modalidad', 'Programa', 'Etapa', 'Estado', 'Director', 'Periodo']);
      // El número de fila va como número, para poder ordenar y filtrar en Excel
      expect(trabajos.data[1][0]).toBe(1);
      expect(trabajos.data[1][1]).toBe('Sistema; de "gestión"');
      expect(trabajos.data).toHaveLength(3);

      expect(resumen.sheet).toBe('Resumen');
      const textos = resumen.data.flat().map((celda: unknown) =>
        celda && typeof celda === 'object' ? (celda as { value: unknown }).value : celda);
      expect(textos).toEqual(expect.arrayContaining(['Alcance', context.scope, 'Periodo', '2026-1',
        'Trabajos registrados', 2, 'Aprobados', 1]));

      expect(descargas).toHaveLength(1);
      expect(descargas[0].nombre).toMatch(/^Reporte_Academico_\d+\.xlsx$/);
      expect(descargas[0].blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('el CSV lleva la tabla con BOM, punto y coma y los textos especiales escapados', async () => {
      service.downloadCsvReport({ ...DEFAULT_STATISTICS_FILTERS }, datos, kpis, context);

      expect(descargas[0].nombre).toMatch(/^Reporte_Academico_\d+\.csv$/);
      // BOM UTF-8: Excel lee bien las tildes
      expect(Array.from((await bytes(descargas[0].blob)).slice(0, 3))).toEqual([0xEF, 0xBB, 0xBF]);
      const lineas = (await leer(descargas[0].blob)).replace(/^\uFEFF/, '').split('\r\n');
      expect(lineas[0]).toBe('#;Título del trabajo;Modalidad;Programa;Etapa;Estado;Director;Periodo');
      // Con el separador o comillas: entre comillas y con las comillas dobladas
      expect(lineas[1]).toBe('1;"Sistema; de ""gestión""";Trabajo de investigación;Ingeniería de Sistemas;'
        + 'Propuesta;En desarrollo;Ana Gómez;2026-1');
      // Lo que Excel tomaría como fórmula queda como texto
      expect(lineas[2].split(';')[1]).toBe('"\'=HIPERVINCULO(""x"")"');
      expect(lineas[3]).toBe('');
    });
  });
});
