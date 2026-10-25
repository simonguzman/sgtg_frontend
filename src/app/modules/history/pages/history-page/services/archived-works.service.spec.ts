import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ARCHIVED_WORK_ACTIONS, ArchivedWorksService } from './archived-works.service';
import { stateList } from '../../../../../core/enums/state.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { iniciarSesionConTrabajos } from '../../../../../testing/sesion-de-prueba';
import {
  cerrarTrabajo, conConceptoDe, crearTrabajoConAnteproyectoRadicado, crearTrabajoDePrueba, crearTrabajoEnCurso,
  crearTrabajoEnEvaluacion
} from '../../../../../testing/trabajo-grado-de-prueba';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: Number(id), firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: Number(id), email: `u${id}@unicauca.edu.co`, state: UserState.active, roles
});

/** Anulado en propuesta (1), cancelado en anteproyecto (2), finalizado (3) y uno activo (4). */
const trabajos = () => [
  cerrarTrabajo(crearTrabajoDePrueba({ id: 1, descripcion: 'Descripción 1' }), 'CANCELADO', 'ANULACION_DIRECTOR',
    '2026-03-10T09:00:00', 'Cambio de modalidad'),
  cerrarTrabajo(crearTrabajoConAnteproyectoRadicado({ id: 2 }), 'CANCELADO', 'CANCELACION_DIRECTOR',
    '2026-05-10T09:00:00'),
  cerrarTrabajo(crearTrabajoEnCurso({ id: 3, etapa: 'SUSTENTACION' }), 'FINALIZADO', null, '2026-08-01T09:00:00'),
  crearTrabajoEnCurso({ id: 4 })
];

describe('ArchivedWorksService', () => {
  const iniciar = (user: User) => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(ArchivedWorksService);
    iniciarSesionConTrabajos(user, trabajos());
    return service;
  };

  afterEach(() => jest.restoreAllMocks());

  it('lista un registro por trabajo archivado, del cierre más reciente al más antiguo', () => {
    const service = iniciar(usuario('80', [UserRoleType.DECANATURA]));

    const filas = service.tableData();
    expect(filas.map(f => f['id'])).toEqual(['3', '2', '1']);
    expect(filas[2]).toEqual(expect.objectContaining({
      title: 'Sistema de gestión',
      modality: 'Investigación',
      authors: 'Eva Estudiante',
      description: 'Descripción 1',
      closedAt: 'Propuesta',
      state: stateList.CANCELADO,
      reason: 'Anulado por el director',
      justification: 'Cambio de modalidad',
      closingDate: '10 - 03 - 2026'
    }));
    expect(filas[0]).toEqual(expect.objectContaining({ closedAt: 'Sustentación', state: stateList.APROBADO }));
  });

  it('cada fila permite consultar las etapas que el trabajo alcanzó', () => {
    const service = iniciar(usuario('80', [UserRoleType.DECANATURA]));
    const acciones = new Map(service.tableData().map(f => [f['id'], f.allowedActions]));
    const { DESCRIPCION, PROPUESTA, ANTEPROYECTO, TRABAJO } = ARCHIVED_WORK_ACTIONS;

    expect(acciones.get('1')).toEqual([DESCRIPCION, PROPUESTA]);
    expect(acciones.get('2')).toEqual([DESCRIPCION, PROPUESTA, ANTEPROYECTO]);
    expect(acciones.get('3')).toEqual([DESCRIPCION, PROPUESTA, ANTEPROYECTO, TRABAJO]);
  });

  it('un participante ve sus trabajos archivados', () => {
    expect(iniciar(usuario('10', [UserRoleType.ESTUDIANTE])).tableData()).toHaveLength(3);
  });

  it('el evaluador solo ve los trabajos que evaluó, y solo su anteproyecto', () => {
    const service = iniciar(usuario('20', [UserRoleType.DOCENTE, UserRoleType.EVALUADOR]));
    // El 3 (archivado) y el 4 (en curso), cuyos anteproyectos evaluó; no los cancelados que no evaluó
    const soloAnteproyecto = [ARCHIVED_WORK_ACTIONS.DESCRIPCION, ARCHIVED_WORK_ACTIONS.ANTEPROYECTO];
    expect(service.tableData()).toEqual([
      expect.objectContaining({ id: '3', allowedActions: soloAnteproyecto }),
      expect.objectContaining({ id: '4', closedAt: 'En curso', allowedActions: soloAnteproyecto })
    ]);
  });

  it('el evaluador ve en su historial los anteproyectos que evaluó cuando decidió el Consejo, solo con el anteproyecto', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(ArchivedWorksService);
    iniciarSesionConTrabajos(usuario('20', [UserRoleType.DOCENTE, UserRoleType.EVALUADOR]), [
      // El Consejo ya aprobó el anteproyecto que evaluó: pasa al historial
      crearTrabajoEnCurso({ id: 5 }),
      // Aún en evaluación (con su concepto o pendiente): sigue en su tabla de anteproyectos
      conConceptoDe(crearTrabajoEnEvaluacion({ id: 6 }), 20, 'CON_CORRECCIONES', '2026-03-20'),
      conConceptoDe(crearTrabajoEnEvaluacion({ id: 7 }), 21)
    ]);

    expect(service.tableData()).toEqual([expect.objectContaining({
      id: '5', closedAt: 'En curso', state: stateList.APROBADO,
      reason: 'Evaluaste la versión 1 del anteproyecto', closingDate: '12 - 03 - 2026',
      allowedActions: [ARCHIVED_WORK_ACTIONS.DESCRIPCION, ARCHIVED_WORK_ACTIONS.ANTEPROYECTO]
    })]);
  });
});
