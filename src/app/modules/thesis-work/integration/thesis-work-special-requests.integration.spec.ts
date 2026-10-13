import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThesisWorkService } from '../services/thesis-work.service';
import { availableRequestTypes } from '../helpers/special-request-availability.helper';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoEnCurso, crearTrabajoEnCursoCon } from '../../../testing/trabajo-grado-de-prueba';
import { DecisionApi, SuspensionApi } from '../../../core/interfaces/api/trabajo-grado-api.interface';

const API = '/api/v1/sgtg/trabajos-grado';
const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

const decision = (resultado: 'APROBADO' | 'NO_APROBADO', fecha: string): DecisionApi => ({
  organo: 'CONSEJO_FACULTAD', resultado, acta: null, rutaArchivo: '15/RESOLUCION/v2/resolucion.pdf',
  observaciones: null, fecha
});

const suspension = (overrides: Partial<SuspensionApi> = {}): SuspensionApi => ({
  rutaSolicitud: '15/SOLICITUD_SUSPENSION/v1/suspension.pdf', fechaSolicitud: '2026-06-01', decision: null,
  fechaInicio: null, etapaPrevia: null, diasRestantes: null, fechaMaximaReanudacion: null, fechaReanudacion: null,
  rutaReanudacion: null, reanudacionAutomatica: false, ...overrides
});

describe('Integración [Trabajo de Grado]: Solicitudes del director y decisiones del Consejo', () => {
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
  const solicitud = (id: string) => trabajo().specialRequests.find(r => r.id === id)!;

  it('cambio de título y objetivos: el director lo solicita y el Consejo lo aprueba', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso()]);

    service.createSpecialRequest('15', {
      requestType: SpecialRequestType.CAMBIO_TITULO, title: 'Nuevo título', objectives: ['G', 'E'],
      justification: 'Cambio de alcance'
    }).subscribe();
    const cambio = { tituloAnterior: 'Sistema de gestión', objetivosAnteriores: ['Objetivo general'],
      tituloPropuesto: 'Nuevo título', objetivosPropuestos: ['G', 'E'], justificacion: 'Cambio de alcance',
      fechaSolicitud: '2026-05-01' };
    http.expectOne(`${API}/15/cambio-objetivos`)
      .flush(crearTrabajoEnCursoCon({ cambiosObjetivos: [{ ...cambio, decision: null }] }));

    expect(solicitud('cambio-objetivos-0').status).toBe(stateList.EN_REVISION);
    expect(availableRequestTypes(trabajo())).not.toContain(SpecialRequestType.CAMBIO_TITULO);

    service.evaluateSpecialRequest('15', solicitud('cambio-objetivos-0'), {
      status: stateList.APROBADO, resolutionDetails: '', resolution: pdf('resolucion.pdf')
    }).subscribe();
    http.expectOne(`${API}/15/cambio-objetivos/decisiones-consejo`).flush(crearTrabajoEnCursoCon(
      { cambiosObjetivos: [{ ...cambio, decision: decision('APROBADO', '2026-05-10') }] },
      { titulo: 'Nuevo título', objetivos: ['G', 'E'] }));

    expect(solicitud('cambio-objetivos-0').status).toBe(stateList.APROBADO);
    expect(trabajo().preliminaryDraftData.proposalData.title).toBe('Nuevo título');
    // Solo una vez
    expect(availableRequestTypes(trabajo())).not.toContain(SpecialRequestType.CAMBIO_TITULO);
  });

  it('suspensión aprobada y reanudación del director', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso()]);

    service.createSpecialRequest('15', { requestType: SpecialRequestType.SUSPENSION, document: pdf('s.pdf') })
      .subscribe();
    http.expectOne(`${API}/15/suspension`).flush(crearTrabajoEnCursoCon({ suspensiones: [suspension()] }));
    expect(solicitud('suspension-0').status).toBe(stateList.EN_REVISION);

    // El Consejo aprueba: el trabajo queda suspendido con la fecha máxima de reanudación
    service.evaluateSpecialRequest('15', solicitud('suspension-0'), {
      status: stateList.APROBADO, resolutionDetails: '', resolution: pdf('r.pdf')
    }).subscribe();
    const aprobada = suspension({ decision: decision('APROBADO', '2026-06-05'), fechaInicio: '2026-06-05',
      etapaPrevia: 'EN_CURSO', diasRestantes: 100, fechaMaximaReanudacion: '2026-12-05' });
    http.expectOne(`${API}/15/suspension/decisiones-consejo`)
      .flush(crearTrabajoEnCursoCon({ suspensiones: [aprobada] }, { etapa: 'SUSPENDIDO' }));

    expect(trabajo().state).toBe(stateList.SUSPENDIDO);
    expect(solicitud('suspension-0').grantedDeadline).toEqual(new Date(2026, 11, 5));
    expect(availableRequestTypes(trabajo())).toEqual([SpecialRequestType.REANUDACION, SpecialRequestType.CANCELACION]);

    // El director reanuda con su documento: vuelve a estar en curso
    service.createSpecialRequest('15', { requestType: SpecialRequestType.REANUDACION, document: pdf('reanudacion.pdf') })
      .subscribe();
    const reanudada = { ...aprobada, fechaReanudacion: '2026-07-01', rutaReanudacion: '15/REANUDACION/v1/reanudacion.pdf' };
    http.expectOne(`${API}/15/suspension/reanudacion`).flush(crearTrabajoEnCursoCon({ suspensiones: [reanudada] }));

    expect(trabajo().state).toBe(stateList.EN_DESARROLLO);
    expect(solicitud('reanudacion-0')).toEqual(expect.objectContaining({
      requestType: SpecialRequestType.REANUDACION, status: stateList.APROBADO
    }));
  });

  it('prórroga no aprobada: el trabajo sigue en curso y no se puede pedir otra', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso()]);

    service.createSpecialRequest('15', { requestType: SpecialRequestType.PRORROGA, months: 3, document: pdf('p.pdf') })
      .subscribe();
    const prorroga = { meses: 3, rutaSolicitud: '15/SOLICITUD_PRORROGA/v1/p.pdf', fechaSolicitud: '2026-11-01' };
    http.expectOne(`${API}/15/prorroga`).flush(crearTrabajoEnCursoCon({ prorroga: { ...prorroga, decision: null } }));

    service.evaluateSpecialRequest('15', solicitud('prorroga-0'), {
      status: stateList.NO_APROBADO, resolutionDetails: 'No procede', resolution: pdf('r.pdf')
    }).subscribe();
    http.expectOne(`${API}/15/prorroga/decisiones-consejo`).flush(crearTrabajoEnCursoCon({
      prorroga: { ...prorroga, decision: { ...decision('NO_APROBADO', '2026-11-10'), observaciones: 'No procede' } }
    }));

    expect(solicitud('prorroga-0')).toEqual(expect.objectContaining({
      status: stateList.NO_APROBADO, resolutionDetails: 'No procede'
    }));
    expect(trabajo().stage).toBe('EN_CURSO');
    expect(availableRequestTypes(trabajo())).not.toContain(SpecialRequestType.PRORROGA);
  });

  it('cancelación aprobada: el trabajo queda cerrado y sale de la lista activa', () => {
    iniciarSesionConTrabajos(usuario('50', [UserRoleType.CONSEJO]), [crearTrabajoEnCurso({
      cancelaciones: [{ rutaSolicitud: '15/SOLICITUD_CANCELACION/v1/c.pdf', fechaSolicitud: '2026-08-01',
        etapaAlSolicitar: 'EN_CURSO', decision: null }]
    })]);

    service.evaluateSpecialRequest('15', solicitud('cancelacion-0'), {
      status: stateList.APROBADO, resolutionDetails: '', resolution: pdf('r.pdf')
    }).subscribe();
    http.expectOne(`${API}/15/cancelacion/decisiones-consejo`).flush(crearTrabajoEnCurso({
      etapa: 'CANCELADO',
      cancelaciones: [{ rutaSolicitud: '15/SOLICITUD_CANCELACION/v1/c.pdf', fechaSolicitud: '2026-08-01',
        etapaAlSolicitar: 'EN_CURSO', decision: decision('APROBADO', '2026-08-10') }]
    }));

    expect(trabajo().state).toBe(stateList.CANCELADO);
    expect(trabajo().isArchived).toBe(true);
    expect(service.thesisWorks()).toEqual([]);
  });

  it('un rechazo del backend se propaga sin cambiar el trabajo', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso()]);

    let error: unknown;
    service.createSpecialRequest('15', {
      requestType: SpecialRequestType.CAMBIO_TITULO, title: 'T', objectives: ['G'], justification: 'J'
    }).subscribe({ error: e => error = e });
    http.expectOne(`${API}/15/cambio-objetivos`).flush(
      { message: 'El cambio de título y objetivos está fuera de plazo' }, { status: 400, statusText: 'Bad Request' });

    expect(error).toBeTruthy();
    expect(trabajo().specialRequests).toEqual([]);
  });
});
