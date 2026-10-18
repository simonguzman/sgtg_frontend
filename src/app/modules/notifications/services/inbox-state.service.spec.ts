import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { INTERVALO_BUZON_MS, InboxStateService } from './inbox-state.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { NotificacionApi } from '../../../core/interfaces/api/notificacion-api.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

const API = '/api/v1/sgtg/notificaciones';

const estudiante: User = {
  id: '10', idType: IdentificationType.CC, idNumber: 10, firstName: 'Eva', lastName: 'Estudiante',
  secondLastName: '', codeNumber: 10, email: 'eva@unicauca.edu.co', state: UserState.active,
  roles: [UserRoleType.ESTUDIANTE]
};

const notificacion = (id: number, overrides: Partial<NotificacionApi> = {}): NotificacionApi => ({
  id, tipo: 'INFO', titulo: `Título ${id}`, mensaje: `Mensaje ${id}`, trabajoId: 15, etapa: 'PROPUESTA',
  fecha: '2026-03-02T10:00:00', leida: false, ...overrides
});

describe('InboxStateService (buzón del backend)', () => {
  let state: InboxStateService;
  let http: HttpTestingController;
  let notification: { show: jest.Mock };

  /** Responde las consultas pendientes del buzón; las de trabajos se responden vacías. */
  const responderBuzon = (lista: NotificacionApi[]) => {
    http.match(req => req.method === 'GET' && req.url === API).forEach(req => req.flush(lista));
    http.match(req => /\/trabajos-grado(\/mis-trabajos)?$/.test(req.url)).forEach(req => req.flush([]));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: NotificationService, useValue: notification }]
    });
    state = TestBed.inject(InboxStateService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStorageService).setSession(crearJwtDePrueba(), estudiante);
    TestBed.tick();
    jest.advanceTimersByTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('al iniciar sesión consulta el buzón y lo muestra sin avisos emergentes', () => {
    responderBuzon([notificacion(2), notificacion(1, { leida: true, tipo: 'ALERTA', etapa: 'EVALUACION' })]);

    const [segunda, primera] = state.messagesSignal();
    expect(segunda).toEqual(expect.objectContaining({ id: '2', userId: '10', title: 'Título 2', status: 'no leido',
      type: NotificationType.INFO, actionUrl: '/proposal/details/15' }));
    expect(segunda.date).toEqual(new Date(2026, 2, 2, 10, 0));
    expect(primera).toEqual(expect.objectContaining({ status: 'leido', type: NotificationType.SECURITY,
      actionUrl: '/preliminary-draft/details/15' }));
    expect(notification.show).not.toHaveBeenCalled();
  });

  it('cada minuto vuelve a consultar; las nuevas se avisan y recargan los trabajos', () => {
    responderBuzon([notificacion(1)]);

    jest.advanceTimersByTime(INTERVALO_BUZON_MS);
    http.expectOne(API).flush([notificacion(2, { titulo: 'Propuesta radicada' }), notificacion(1)]);

    expect(state.messagesSignal().map(m => m.id)).toEqual(['2', '1']);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Propuesta radicada' }));
    // Alguien cambió un trabajo: se recarga la lista
    http.expectOne(req => req.url.endsWith('/trabajos-grado/mis-trabajos')).flush([]);
  });

  it('con notificaciones nuevas se refresca el usuario: recibe los roles que le dio el backend', () => {
    responderBuzon([]);
    jest.advanceTimersByTime(INTERVALO_BUZON_MS);
    http.expectOne(API).flush([notificacion(2, { titulo: 'Evaluadores asignados', etapa: 'EVALUACION' })]);
    http.expectOne(req => req.url.endsWith('/trabajos-grado/mis-trabajos')).flush([]);

    http.expectOne(req => req.url.endsWith('/usuarios/me')).flush({
      id: 10, codigo: '10', tipoDocumento: 'CC', numeroDocumento: '10', email: 'eva@unicauca.edu.co',
      primerNombre: 'Eva', segundoNombre: null, primerApellido: 'Estudiante', segundoApellido: null,
      roles: ['DOCENTE', 'EVALUADOR'], activo: true, tipoVinculacion: null, departamento: null, programa: null
    });
    expect(TestBed.inject(AuthStorageService).userRoles()).toContain(UserRoleType.EVALUADOR);
  });

  it('sin notificaciones nuevas no se refresca el usuario', () => {
    responderBuzon([notificacion(1)]);
    jest.advanceTimersByTime(INTERVALO_BUZON_MS);
    http.expectOne(API).flush([notificacion(1)]);
    http.expectNone(req => req.url.endsWith('/usuarios/me'));
  });

  it('varias nuevas se resumen en un solo aviso', () => {
    responderBuzon([]);
    jest.advanceTimersByTime(INTERVALO_BUZON_MS);
    responderBuzon([notificacion(3), notificacion(2)]);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Tienes 2 notificaciones nuevas' }));
  });

  it('marcar como leída actualiza el buzón y el backend', () => {
    responderBuzon([notificacion(1)]);

    state.markAsRead('1');
    expect(state.messagesSignal()[0].status).toBe('leido');
    const req = http.expectOne(`${API}/1/leida`);
    expect(req.request.method).toBe('PATCH');
    req.flush(notificacion(1, { leida: true }));

    // Ya leída: no vuelve a llamar
    state.markAsRead('1');
    http.expectNone(`${API}/1/leida`);
  });

  it('si el backend rechaza la acción, se vuelve a consultar el buzón', () => {
    responderBuzon([notificacion(1)]);
    state.markAsRead('1');
    http.expectOne(`${API}/1/leida`).flush({ message: 'No' }, { status: 406, statusText: 'Not Acceptable' });
    http.expectOne(API).flush([notificacion(1)]);
    expect(state.messagesSignal()[0].status).toBe('no leido');
  });

  it('elimina una notificación o vacía el buzón', () => {
    responderBuzon([notificacion(2), notificacion(1)]);

    state.deleteMessage('2');
    expect(state.messagesSignal().map(m => m.id)).toEqual(['1']);
    expect(http.expectOne(`${API}/2`).request.method).toBe('DELETE');

    state.clearAllMessages();
    expect(state.messagesSignal()).toEqual([]);
    expect(http.expectOne(req => req.method === 'DELETE' && req.url === API)).toBeTruthy();
  });

  it('al cerrar sesión se vacía y deja de consultar', () => {
    responderBuzon([notificacion(1)]);

    TestBed.inject(AuthStorageService).clearUser();
    TestBed.tick();
    expect(state.messagesSignal()).toEqual([]);

    jest.advanceTimersByTime(INTERVALO_BUZON_MS * 2);
    http.expectNone(API);
  });
});
