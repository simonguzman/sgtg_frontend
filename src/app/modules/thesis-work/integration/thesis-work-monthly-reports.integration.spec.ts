import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThesisWorkService } from '../services/thesis-work.service';
import { AdvancesTabConfig } from '../pages/loaded-documents-thesis-work-page/tabs-logic/advances.tab';
import { ThesisEvaluationContext } from '../pages/loaded-documents-thesis-work-page/tabs-logic/tab-config.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import {
  crearTrabajoEnCurso, crearTrabajoEnCursoCon, informeDePrueba, reunionDePrueba, revisionDePrueba
} from '../../../testing/trabajo-grado-de-prueba';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';

const API = '/api/v1/sgtg/trabajos-grado';
const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

/** Reunión 1 agendada y por venir: recibe el informe que se radique ahora. */
const reunionAbierta = (extra: Parameters<typeof reunionDePrueba>[1] = {}) => reunionDePrueba(1, {
  fechaHora: '2026-04-20T10:00:00', lugar: 'Sala 2', estado: 'AGENDADA', recibeInforme: true, ...extra
});
const conReunionAbierta = (overrides: Partial<TrabajoGradoResponse> = {}) =>
  crearTrabajoEnCursoCon({ reuniones: [reunionAbierta()] }, overrides);

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

/** Contexto de la pestaña de informes para un usuario y su rol en el trabajo. */
const contexto = (thesisWork: ThesisWork, currentUser: User,
  rol: Partial<ThesisEvaluationContext>): ThesisEvaluationContext =>
  AdvancesTabConfig.enrichEvaluationContext({
    thesisWork, currentUser, isAdmin: false, isStudent: false, isDirector: false, isDecanatura: false,
    isCodirector: false, isAdvisor: false, isJuror: false, isConsejo: false, latestAdvanceId: null,
    isLatestAdvancePending: false, isArchived: thesisWork.isArchived, ...rol
  });

describe('Integración [Trabajo de Grado]: Informes mensuales contra el backend', () => {
  let service: ThesisWorkService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ThesisWorkService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => jest.restoreAllMocks());

  const trabajo = () => service.allThesisWorks().find(w => w.thesisWorkId === '15')!;

  it('la estudiante radica el informe y la directora lo revisa con sus notas, sin cambiar la etapa', () => {
    const estudiante = usuario('10', [UserRoleType.ESTUDIANTE]);
    // Con la reunión 1 agendada y por venir, la estudiante carga su informe
    iniciarSesionConTrabajos(estudiante, [conReunionAbierta()]);
    expect(AdvancesTabConfig.getHeaderButtons(contexto(trabajo(), estudiante, { isStudent: true }))
      .find(boton => boton.action === 'upload_advance'))
      .toEqual(expect.objectContaining({ label: 'Cargar informe de la reunión 1', disabled: false }));

    service.radicarInforme('15', pdf('informe.pdf'), 'Primer mes').subscribe();
    http.expectOne(`${API}/15/informes-mensuales`)
      .flush(crearTrabajoEnCursoCon({
        informesMensuales: [informeDePrueba(1, { observaciones: 'Primer mes' })],
        reuniones: [reunionAbierta({ conInforme: true, recibeInforme: false })]
      }));
    expect(trabajo().meetings?.[0]).toEqual(expect.objectContaining({ hasReport: true, acceptsReport: false }));

    expect(trabajo().advances?.map(a => [a.title, a.status, a.uploadedBy])).toEqual([
      ['Informe mensual 1', stateList.EN_REVISION, 'Eva Estudiante']
    ]);

    // La directora ve la acción de revisar
    const directora = usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);
    expect(AdvancesTabConfig.getTableData([], contexto(trabajo(), directora, { isDirector: true }))[0].allowedActions)
      .toContain('evaluate-advance');

    service.revisarInforme('15', '1', 'Ajustar el cronograma', pdf('notas.pdf')).subscribe();
    http.expectOne(`${API}/15/informes-mensuales/1/revisiones`)
      .flush(crearTrabajoEnCursoCon({
        informesMensuales: [informeDePrueba(1, { observaciones: 'Primer mes', revisiones: [revisionDePrueba()] })]
      }));

    expect(trabajo().advances?.[0].status).toBe(stateList.EVALUADO);
    expect(trabajo().stage).toBe('EN_CURSO');
    expect(trabajo().state).toBe(stateList.EN_DESARROLLO);
    expect(trabajo().evaluations[0]).toEqual(expect.objectContaining({
      advanceId: '1', evaluatorName: 'Dora Directora Pérez', observations: 'Ajustar el cronograma'
    }));
    // Ya revisó: no puede repetir la revisión
    expect(AdvancesTabConfig.getTableData([], contexto(trabajo(), directora, { isDirector: true }))[0].allowedActions)
      .toEqual(['view-details']);
  });

  it.each(['TRABAJO_DE_INVESTIGACION', 'PRACTICA_PROFESIONAL'] as const)(
    'la directora también radica informes (%s)', modalidad => {
      const directora = usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);
      iniciarSesionConTrabajos(directora, [conReunionAbierta({ modalidad })]);
      expect(AdvancesTabConfig.getHeaderButtons(contexto(trabajo(), directora, { isDirector: true }))
        .find(boton => boton.action === 'upload_advance')).toEqual(expect.objectContaining({ disabled: false }));
    });

  it('si el backend rechaza la radicación, el trabajo no cambia', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso()]);

    let error: unknown;
    service.radicarInforme('15', pdf('informe.pdf'), '').subscribe({ error: e => error = e });
    http.expectOne(`${API}/15/informes-mensuales`).flush(
      { message: 'El informe mensual se radica para una reunión de seguimiento: el director debe agendarla y el informe se carga antes de su fecha y hora.' },
      { status: 400, statusText: 'Bad Request' });

    expect(error).toBeTruthy();
    expect(trabajo().advances).toEqual([]);
  });
});
