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
  crearTrabajoEnCurso, crearTrabajoEnCursoCon, informeDePrueba, revisionDePrueba
} from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';
const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

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
    iniciarSesionConTrabajos(estudiante, [crearTrabajoEnCurso()]);

    // La estudiante puede cargar el informe en investigación
    expect(AdvancesTabConfig.getHeaderButtons(contexto(trabajo(), estudiante, { isStudent: true }))[0].disabled)
      .toBe(false);

    service.radicarInforme('15', pdf('informe.pdf'), 'Primer mes').subscribe();
    http.expectOne(`${API}/15/informes-mensuales`)
      .flush(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1, { observaciones: 'Primer mes' })] }));

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

  it('en práctica profesional la directora también radica informes', () => {
    const directora = usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);
    iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso({ modalidad: 'PRACTICA_PROFESIONAL' })]);

    expect(AdvancesTabConfig.getHeaderButtons(contexto(trabajo(), directora, { isDirector: true }))).toEqual([
      expect.objectContaining({ action: 'upload_advance', disabled: false })
    ]);
  });

  it('si el backend rechaza la radicación, el trabajo no cambia', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso()]);

    let error: unknown;
    service.radicarInforme('15', pdf('informe.pdf'), '').subscribe({ error: e => error = e });
    http.expectOne(`${API}/15/informes-mensuales`).flush(
      { message: 'Los informes mensuales los radican los estudiantes del trabajo' },
      { status: 406, statusText: 'Not Acceptable' });

    expect(error).toBeTruthy();
    expect(trabajo().advances).toEqual([]);
  });
});
