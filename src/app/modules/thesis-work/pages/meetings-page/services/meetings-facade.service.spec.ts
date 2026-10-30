import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MeetingsFacadeService } from './meetings-facade.service';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { iniciarSesionConTrabajos } from '../../../../../testing/sesion-de-prueba';
import { crearTrabajoEnCursoCon, informeDePrueba, reunionDePrueba } from '../../../../../testing/trabajo-grado-de-prueba';
import { TrabajoGradoResponse } from '../../../../../core/interfaces/api/trabajo-grado-api.interface';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: Number(id), firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: Number(id), email: `u${id}@unicauca.edu.co`, state: UserState.active, roles
});

/** Trabajo 15 en curso: reunión 1 realizada con su informe, 2 agendada, 3 pendiente. */
const trabajo = (overrides: Partial<TrabajoGradoResponse> = {}) => crearTrabajoEnCursoCon({
  informesMensuales: [informeDePrueba(1)],
  reuniones: [
    reunionDePrueba(1, { fechaHora: '2026-04-20T10:00:00', lugar: 'Sala 2', realizada: true,
      observaciones: 'Avance', conInforme: true, estado: 'REALIZADA' }),
    reunionDePrueba(2, { fechaHora: '2026-05-20T15:00:00', lugar: 'https://meet.google.com/x', estado: 'AGENDADA' }),
    reunionDePrueba(3)
  ]
}, overrides);

describe('MeetingsFacadeService', () => {
  let facade: MeetingsFacadeService;
  let http: HttpTestingController;
  let notification: { show: jest.Mock };

  const iniciar = (user: User, trabajos: TrabajoGradoResponse[] = [trabajo()]) => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MeetingsFacadeService,
        { provide: NotificationService, useValue: notification }]
    });
    facade = TestBed.inject(MeetingsFacadeService);
    http = TestBed.inject(HttpTestingController);
    iniciarSesionConTrabajos(user, trabajos);
    facade.thesisWorkId.set('15');
  };

  afterEach(() => jest.restoreAllMocks());

  it('muestra cada reunión del plazo con su fecha, lugar, informe y estado', () => {
    iniciar(usuario('10', [UserRoleType.ESTUDIANTE]));

    const [realizada, agendada, pendiente] = facade.rows();
    expect(realizada).toEqual(expect.objectContaining({
      meeting: 'Reunión 1', suggestedDate: '20 - 04 - 2026', place: 'Sala 2', report: 'Informe 1 radicado',
      status: stateList.REALIZADA
    }));
    expect(agendada.scheduled).toContain('20 - 05 - 2026');
    expect(agendada.report).toBe('Pendiente');
    expect(pendiente).toEqual(expect.objectContaining({ scheduled: 'Sin agendar', status: stateList.PENDIENTE }));
    expect(facade.summary()).toEqual({ total: 3, held: 1, withReport: 1 });
  });

  it('los participantes que no son el director solo ven los detalles', () => {
    iniciar(usuario('10', [UserRoleType.ESTUDIANTE]));
    expect(facade.rows().every(row => row.allowedActions.join() === 'view-details')).toBe(true);
  });

  it('el director agenda las que no se han realizado y registra las agendadas', () => {
    iniciar(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]));

    const [realizada, agendada, pendiente] = facade.rows();
    expect(realizada.allowedActions).toEqual(['view-details']);
    expect(agendada.allowedActions).toEqual(['view-details', 'schedule', 'register-held']);
    expect(pendiente.allowedActions).toEqual(['view-details', 'schedule']);
  });

  it('con el trabajo suspendido el director no agenda', () => {
    iniciar(usuario('1', [UserRoleType.DIRECTOR]), [trabajo({ etapa: 'SUSPENDIDO' })]);
    expect(facade.rows()[2].allowedActions).toEqual(['view-details']);
  });

  it('agenda una vez mientras se guarda y muestra el motivo si el backend la rechaza', () => {
    iniciar(usuario('1', [UserRoleType.DIRECTOR]));
    const reunion = facade.meetings()[2];
    const exito = jest.fn();

    facade.schedule(reunion, new Date(2026, 5, 20, 10, 0), 'Sala 2', exito);
    facade.schedule(reunion, new Date(2026, 5, 20, 10, 0), 'Sala 2', exito);
    const req = http.expectOne('/api/v1/sgtg/trabajos-grado/15/reuniones/3');
    req.flush({ message: 'La reunión de seguimiento no se puede agendar en una fecha pasada.' },
      { status: 400, statusText: 'Bad Request' });

    expect(exito).not.toHaveBeenCalled();
    expect(facade.isSubmitting()).toBe(false);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'La reunión de seguimiento no se puede agendar en una fecha pasada.'
    }));
  });

  it('al registrar la reunión como realizada actualiza la tabla', () => {
    iniciar(usuario('1', [UserRoleType.DIRECTOR]));
    const exito = jest.fn();

    facade.registerHeld(facade.meetings()[1], 'Se revisó el informe', exito);
    http.expectOne('/api/v1/sgtg/trabajos-grado/15/reuniones/2/realizada').flush(trabajo({
      ejecucion: { ...trabajo().ejecucion!, reuniones: [
        reunionDePrueba(2, { fechaHora: '2026-05-20T15:00:00', lugar: 'Sala', realizada: true, estado: 'REALIZADA' })
      ] }
    }));

    expect(exito).toHaveBeenCalled();
    expect(facade.rows()[0].status).toBe(stateList.REALIZADA);
  });
});
