import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThesisWorkService } from '../services/thesis-work.service';
import { SustentationTabConfig } from '../pages/loaded-documents-thesis-work-page/tabs-logic/sustentation.tab';
import { FinalDeliveryTabConfig } from '../pages/loaded-documents-thesis-work-page/tabs-logic/final-delivery.tab';
import { CorrespondenceTabConfig } from '../pages/loaded-documents-thesis-work-page/tabs-logic/correspondence.tab';
import { availableRequestTypes } from '../helpers/special-request-availability.helper';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { contextoDePestana } from '../../../testing/contexto-de-pestana';
import {
  crearTrabajoEnCurso, crearTrabajoEnSustentacion, sustentacionDePrueba
} from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';
const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

describe('Integración [Trabajo de Grado]: Sustentación con jurado coordinador contra el backend', () => {
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

  it('solicitud, programación, nueva fecha, calificación con observaciones, ajustes y versión definitiva', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso()]);

    // El director solicita la sustentación
    expect(FinalDeliveryTabConfig.getHeaderButtons(FinalDeliveryTabConfig.enrichEvaluationContext(
      contextoDePestana(trabajo(), { isDirector: true })))[0].disabled).toBe(false);
    service.requestSustentation('15', { monograph: pdf('m.pdf'), formatE: pdf('e.pdf'), pazYSalvo: pdf('f.pdf') })
      .subscribe();
    http.expectOne(`${API}/15/sustentacion`).flush(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [] }));
    expect(trabajo().sustentation?.state).toBe('SOLICITADA');
    expect(SustentationTabConfig.getHeaderButtons(contextoDePestana(trabajo(), { isConsejo: true }))[0])
      .toEqual(expect.objectContaining({ label: 'Programar sustentación', disabled: false }));

    // El Consejo programa con el coordinador 30 y el formato E
    service.scheduleSustentation('15', { coordinatorId: '30', jurorId: '31', dateTime: '2026-07-15T09:30:00',
      location: 'Sala 1', formatE: pdf('e.pdf') }).subscribe();
    http.expectOne(`${API}/15/sustentacion/programacion`).flush(crearTrabajoEnSustentacion());
    expect(trabajo().sustentation?.coordinatorId).toBe('30');

    // El director pide una nueva fecha; el Consejo la aprueba con la nueva fecha y hora
    expect(availableRequestTypes(trabajo())).toContain(SpecialRequestType.NUEVA_SUSTENTACION);
    service.createSpecialRequest('15', { requestType: SpecialRequestType.NUEVA_SUSTENTACION, document: pdf('n.pdf') })
      .subscribe();
    const solicitud = { sesion: 1, rutaSolicitud: '15/SOLICITUD_NUEVA_FECHA/v1/n.pdf', fechaSolicitud: '2026-07-10',
      fechaHoraAnterior: '2026-07-15T09:30:00', nuevoSalon: null };
    http.expectOne(`${API}/15/sustentacion/nueva-fecha`).flush(crearTrabajoEnSustentacion({
      solicitudesNuevaFecha: [{ ...solicitud, decision: null, nuevaFechaHora: null }]
    }));
    // Con la solicitud pendiente el coordinador no califica
    expect(SustentationTabConfig.getTableData([], contextoDePestana(trabajo(), { isCoordinator: true }))[0]
      .allowedActions).not.toContain('evaluate_sustentation');

    const pendiente = trabajo().specialRequests.find(r => r.id === 'nueva-fecha-0')!;
    service.evaluateSpecialRequest('15', pendiente, { status: stateList.APROBADO, resolutionDetails: '',
      resolution: pdf('r.pdf'), newDateTime: '2026-07-21T09:00:00' }).subscribe();
    const decision = http.expectOne(`${API}/15/sustentacion/nueva-fecha/decisiones-consejo`);
    const base = sustentacionDePrueba();
    decision.flush(crearTrabajoEnSustentacion({
      sesiones: [{ ...base.sesiones[0], fechaHora: '2026-07-21T09:00:00' }],
      solicitudesNuevaFecha: [{ ...solicitud, nuevaFechaHora: '2026-07-21T09:00:00', decision: {
        organo: 'CONSEJO_FACULTAD', resultado: 'APROBADO', acta: null, rutaArchivo: '15/RESOLUCION/v2/r.pdf',
        observaciones: null, fecha: '2026-07-12' } }]
    }));
    expect(trabajo().sustentation?.currentSessionDate).toEqual(new Date(2026, 6, 21, 9, 0));
    expect(SustentationTabConfig.getTableData([], contextoDePestana(trabajo(), { isCoordinator: true }))[0]
      .allowedActions).toContain('evaluate_sustentation');

    // El coordinador califica con observaciones; el director radica los ajustes; el coordinador los verifica
    service.gradeSustentation('15', 'APROBADO_CON_OBSERVACIONES', 'Ajustar', pdf('acta.pdf')).subscribe();
    http.expectOne(`${API}/15/sustentacion/calificaciones`).flush(crearTrabajoEnSustentacion({ estado: 'EN_AJUSTES' }));
    service.submitAdjustments('15', pdf('ajustes.pdf'), pdf('anexos.pdf')).subscribe();
    http.expectOne(`${API}/15/sustentacion/ajustes`).flush(crearTrabajoEnSustentacion({
      estado: 'AJUSTES_RADICADOS', rutaAjustes: '15/AJUSTES_SUSTENTACION/v1/ajustes.pdf',
      rutaAnexosAjustes: '15/ANEXOS/v2/anexos.pdf', fechaAjustes: '2026-07-24'
    }));
    expect(trabajo().correctedDeliveries?.[0].annexes?.name).toBe('anexos');
    service.verifyAdjustments('15', true, '').subscribe();
    http.expectOne(`${API}/15/sustentacion/ajustes/verificaciones`).flush(crearTrabajoEnSustentacion({
      estado: 'APROBADA'
    }));
    expect(CorrespondenceTabConfig.getHeaderButtons(contextoDePestana(trabajo(), { isCoordinator: true }))[0])
      .toEqual(expect.objectContaining({ label: 'Cargar versión definitiva', disabled: false }));

    // El coordinador carga la versión definitiva: el trabajo finaliza y sale de la lista activa
    service.uploadFinalVersion('15', pdf('definitiva.pdf')).subscribe();
    http.expectOne(`${API}/15/sustentacion/version-definitiva`).flush(crearTrabajoEnSustentacion({
      estado: 'FINALIZADA', rutaVersionDefinitiva: '15/TI-H/v1/definitiva.pdf', fechaVersionDefinitiva: '2026-07-25'
    }, { etapa: 'FINALIZADO' }));
    expect(trabajo().state).toBe(stateList.APROBADO);
    expect(service.thesisWorks()).toEqual([]);
  });

  it('la inasistencia de la segunda sesión deja el trabajo no aprobado', () => {
    iniciarSesionConTrabajos(usuario('30', [UserRoleType.DOCENTE, UserRoleType.JURADO, UserRoleType.JURADO_COORDINADOR]),
      [crearTrabajoEnSustentacion()]);

    service.registerNonAttendance('15', 'No se presentó').subscribe();
    const req = http.expectOne(`${API}/15/sustentacion/inasistencia`);
    expect(req.request.body).toEqual({ observaciones: 'No se presentó' });
    req.flush(crearTrabajoEnSustentacion({ estado: 'NO_APROBADA', motivoNoAprobacion: 'INASISTENCIA_SUSTENTACION' },
      { etapa: 'NO_APROBADO', motivoCierre: 'INASISTENCIA_SUSTENTACION' }));

    expect(trabajo().state).toBe(stateList.NO_APROBADO);
    expect(trabajo().isArchived).toBe(true);
  });
});
