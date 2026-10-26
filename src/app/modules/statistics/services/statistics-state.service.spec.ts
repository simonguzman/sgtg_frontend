import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { StatisticsStateService } from './statistics-state.service';
import { ProjectDataMapperService } from './project-data-mapper.service';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { DEFAULT_STATISTICS_FILTERS } from '../interfaces/statisticsFilters.interface';
import { statisticsScope } from '../models/statistics-options.model';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import {
  cerrarTrabajo, crearTrabajoConAnteproyectoRadicado, crearTrabajoDePrueba, crearTrabajoEnAnteproyecto, crearTrabajoEnCurso, crearTrabajoEnEvaluacion
} from '../../../testing/trabajo-grado-de-prueba';

const consejo: User = {
  id: '70', idType: IdentificationType.CC, idNumber: 70, firstName: 'Consejo', lastName: 'Facultad',
  secondLastName: '', codeNumber: 70, email: 'consejo@unicauca.edu.co', state: UserState.active,
  roles: [UserRoleType.CONSEJO]
};

const raw = (overrides: Partial<RawProjectData> = {}): RawProjectData => ({
  id: 'raw-1',
  title: 'Proyecto',
  stage: ProjectStage.PROPUESTA,
  status: ProjectStatus.EN_REVISION,
  originalState: stateList.EN_REVISION,
  period: '2026-1',
  directorId: 'usr-1',
  directorName: 'Director',
  registrationDate: new Date(),
  isArchived: false,
  deadlineStatus: null,
  ...overrides
});

describe('StatisticsStateService', () => {
  const configurar = (mapper?: Partial<ProjectDataMapperService>) => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(mapper ? [{ provide: ProjectDataMapperService, useValue: mapper }] : [])
      ]
    });
    return TestBed.inject(StatisticsStateService);
  };

  afterEach(() => jest.restoreAllMocks());

  describe('un registro por trabajo de grado (datos del backend)', () => {
    it('cada trabajo se cuenta una vez, en la etapa más avanzada que alcanzó', () => {
      const service = configurar();
      iniciarSesionConTrabajos(consejo, [
        crearTrabajoDePrueba({ id: 1 }),
        crearTrabajoEnAnteproyecto({ id: 2 }),
        crearTrabajoEnEvaluacion({ id: 3 }),
        crearTrabajoEnCurso({ id: 4 }),
        crearTrabajoConAnteproyectoRadicado({ id: 5 })
      ]);

      const porId = new Map(service.rawData().map(dato => [dato.id, dato]));
      expect(service.rawData()).toHaveLength(5);
      expect(porId.get('1')?.stage).toBe(ProjectStage.PROPUESTA);
      // Propuesta aprobada sin anteproyecto radicado: cuenta como propuesta aprobada
      expect(porId.get('2')).toEqual(expect.objectContaining({
        stage: ProjectStage.PROPUESTA, status: ProjectStatus.APROBADO }));
      expect(porId.get('5')?.stage).toBe(ProjectStage.ANTEPROYECTO);
      expect(porId.get('3')?.stage).toBe(ProjectStage.ANTEPROYECTO);
      expect(porId.get('4')?.stage).toBe(ProjectStage.TRABAJO_GRADO);
      expect(porId.get('4')?.status).toBe(ProjectStatus.EN_DESARROLLO);
    });

    it('un trabajo cerrado se cuenta archivado y con su resultado final', () => {
      const service = configurar();
      iniciarSesionConTrabajos(consejo, [
        cerrarTrabajo(crearTrabajoDePrueba({ id: 1 }), 'CANCELADO', 'ANULACION_DIRECTOR'),
        cerrarTrabajo(crearTrabajoEnCurso({ id: 2 }), 'NO_APROBADO', 'VENCIMIENTO_PLAZO'),
        cerrarTrabajo(crearTrabajoEnCurso({ id: 3 }), 'FINALIZADO', null)
      ]);

      const porId = new Map(service.rawData().map(dato => [dato.id, dato]));
      expect(porId.get('1')).toEqual(expect.objectContaining({
        stage: ProjectStage.PROPUESTA, isArchived: true, status: ProjectStatus.CANCELADO }));
      expect(porId.get('2')).toEqual(expect.objectContaining({
        stage: ProjectStage.TRABAJO_GRADO, isArchived: true, status: ProjectStatus.NO_APROBADO }));
      expect(porId.get('3')).toEqual(expect.objectContaining({
        stage: ProjectStage.TRABAJO_GRADO, isArchived: true, status: ProjectStatus.APROBADO }));
      // Por defecto se cuentan todos, en proceso y cerrados
      expect(service.filteredData()).toHaveLength(3);
    });

    it('cuenta la modalidad y el programa del trabajo, y filtra por ellos', () => {
      const service = configurar();
      iniciarSesionConTrabajos(consejo, [
        crearTrabajoDePrueba({ id: 1 }),
        crearTrabajoDePrueba({ id: 2, modalidad: 'PRACTICA_PROFESIONAL', estudiantes: [{ usuarioId: 11, codigo: '1111',
          nombreCompleto: 'Leo Estudiante', email: 'leo@unicauca.edu.co', programa: { id: 2, nombre: 'Ingeniería Electrónica' } }] })
      ]);

      expect(service.modalityOptions()).toEqual(['Práctica profesional', 'Trabajo de investigación']);
      expect(service.programOptions()).toEqual(['Ingeniería de Sistemas', 'Ingeniería Electrónica']);
      service.updateFilters({ modality: 'Práctica profesional' });
      expect(service.filteredData().map(dato => dato.id)).toEqual(['2']);
      service.updateFilters({ modality: null, program: 'Ingeniería de Sistemas' });
      expect(service.filteredData().map(dato => dato.id)).toEqual(['1']);
    });

    it('un anteproyecto que espera al Consejo (evaluado) también se cuenta', () => {
      const service = configurar();
      iniciarSesionConTrabajos(consejo, [crearTrabajoEnEvaluacion({ id: 3, etapa: 'APROBACION_CONSEJO' })]);
      expect(service.filteredData().map(dato => dato.stage)).toEqual([ProjectStage.ANTEPROYECTO]);
    });
  });

  describe('alcance según el rol', () => {
    it('el Consejo, la Decanatura y el administrador cuentan toda la facultad', () => {
      const service = configurar();
      iniciarSesionConTrabajos(consejo, []);
      expect(service.scope()).toBe('Todos los trabajos de grado de la facultad.');
      expect(statisticsScope([UserRoleType.DECANATURA])).toBe('Todos los trabajos de grado de la facultad.');
    });

    it('el Comité, el jefe y los docentes cuentan los trabajos que el backend les deja consultar', () => {
      expect(statisticsScope([UserRoleType.DOCENTE, UserRoleType.DIRECTOR])).toBe('Trabajos de grado que puede consultar: '
        + 'aquellos en los que participa (como director, codirector, asesor, evaluador o jurado).');
      expect(statisticsScope([UserRoleType.DOCENTE, UserRoleType.COMITE, UserRoleType.JEFE_DEP])).toBe(
        'Trabajos de grado que puede consultar: los de los programas de su departamento, los dirigidos por docentes '
        + 'de su departamento y aquellos en los que participa (como director, codirector, asesor, evaluador o jurado).');
    });
  });

  describe('filtros', () => {
    const activo = raw({ id: '1', period: '2026-1', directorId: 'd1', directorName: 'Juan Pérez',
      deadlineStatus: EvaluationDeadlineStatus.ON_TIME });
    const archivado = raw({ id: '2', stage: ProjectStage.ANTEPROYECTO, period: '2025-2', directorId: 'd2',
      directorName: 'Ana Gómez', isArchived: true, deadlineStatus: EvaluationDeadlineStatus.DELAYED });
    const sinEvaluar = raw({ id: '3', period: '2026-1', directorId: 'd1', directorName: 'Juan Pérez' });
    const sinDirector = raw({ id: '4', period: '2024-2', directorId: 'sin-director', directorName: 'Sin Asignar',
      isArchived: true });

    let service: StatisticsStateService;

    beforeEach(() => {
      const datos = new Map([activo, archivado, sinEvaluar, sinDirector].map(dato => [dato.id, dato]));
      service = configurar({ mapProposal: jest.fn(propuesta => datos.get(propuesta.id!)!) });
      iniciarSesionConTrabajos(consejo, [1, 2, 3, 4].map(id => crearTrabajoDePrueba({ id })));
    });

    it('inicia con los filtros por defecto (todos los trabajos) y los limpia', () => {
      const porDefecto = DEFAULT_STATISTICS_FILTERS;
      expect(porDefecto.archiveStatus).toBe('ALL');
      expect(service.currentFilters()).toEqual(porDefecto);

      service.updateFilters({ stage: ProjectStage.PROPUESTA });
      expect(service.currentFilters()).toEqual({ ...porDefecto, stage: ProjectStage.PROPUESTA });

      service.updateFilters({ period: '2025-1', archiveStatus: 'ACTIVE' });
      service.clearFilters();
      expect(service.currentFilters()).toEqual(porDefecto);
    });

    it('periodos únicos en orden descendente y directores sin "sin-director"', () => {
      expect(service.periodsOptions()).toEqual(['2026-1', '2025-2', '2024-2']);
      expect(service.directorsOptions()).toEqual([
        { id: 'd1', name: 'Juan Pérez' },
        { id: 'd2', name: 'Ana Gómez' }
      ]);
    });

    it('filtra por estado del trabajo (en proceso o cerrado)', () => {
      expect(service.filteredData().map(p => p.id)).toEqual(['1', '2', '3', '4']);
      service.updateFilters({ archiveStatus: 'ACTIVE' });
      expect(service.filteredData().map(p => p.id)).toEqual(['1', '3']);
      service.updateFilters({ archiveStatus: 'ARCHIVED' });
      expect(service.filteredData().map(p => p.id)).toEqual(['2', '4']);
    });

    it('filtra por plazo de evaluación', () => {
      service.updateFilters({ archiveStatus: 'ALL', deadlineFilter: 'NOT_EVALUATED' });
      expect(service.filteredData().map(p => p.id)).toEqual(['3', '4']);
      service.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.ON_TIME });
      expect(service.filteredData().map(p => p.id)).toEqual(['1']);
      service.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.DELAYED });
      expect(service.filteredData().map(p => p.id)).toEqual(['2']);
    });

    it('combina etapa, periodo, director y plazo', () => {
      service.updateFilters({ archiveStatus: 'ALL', stage: ProjectStage.PROPUESTA, period: '2026-1',
        directorId: 'd1', deadlineFilter: EvaluationDeadlineStatus.ON_TIME });
      expect(service.filteredData().map(p => p.id)).toEqual(['1']);
    });
  });
});
