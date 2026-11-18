import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { StatisticsRemindersService } from './statistics-reminders.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { crearTrabajoEnCurso } from '../../../testing/trabajo-grado-de-prueba';
import { environment } from '../../../../environments/environment';

const API = `${environment.apiUrl}/trabajos-grado`;
const proyecto = (id: string): RawProjectData => ({ id, title: `Trabajo ${id}` } as RawProjectData);

describe('StatisticsRemindersService', () => {
  let service: StatisticsRemindersService;
  let http: HttpTestingController;
  const roles = signal<string[]>([]);
  const store = { upsert: jest.fn() };
  const notification = { success: jest.fn(), info: jest.fn(), error: jest.fn() };

  const yaRecordado = { status: 400, statusText: 'Bad Request' };
  const cuerpoYaRecordado = { message: 'Ya se envió hoy el recordatorio de entrega de este trabajo de grado.' };

  beforeEach(() => {
    jest.clearAllMocks();
    roles.set([UserRoleType.DECANATURA]);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: TrabajoGradoStoreService, useValue: store },
        { provide: AuthStorageService, useValue: { userRoles: roles } },
        { provide: NotificationService, useValue: notification }
      ]
    });
    service = TestBed.inject(StatisticsRemindersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recuerdan la entrega Decanatura, Consejo, administrador, Comité y jefe; no el director ni el estudiante', () => {
    for (const rol of [UserRoleType.DECANATURA, UserRoleType.CONSEJO, UserRoleType.ADMINISTRADOR, UserRoleType.COMITE,
      UserRoleType.JEFE_DEP]) {
      roles.set([rol]);
      expect(service.canRemind()).toBe(true);
    }
    roles.set([UserRoleType.DIRECTOR, UserRoleType.DOCENTE]);
    expect(service.canRemind()).toBe(false);
    expect(service.canOpenDetails()).toBe(true);
    roles.set([UserRoleType.JEFE_DEP]);
    expect(service.canOpenDetails()).toBe(false);
  });

  it('envía el recordatorio, actualiza el trabajo y lo marca como recordado hoy', () => {
    service.remind(proyecto('15'));
    expect(service.sending().has('15')).toBe(true);

    const peticion = http.expectOne(`${API}/15/recordatorio-entrega`);
    expect(peticion.request.method).toBe('POST');
    const trabajo = crearTrabajoEnCurso();
    peticion.flush(trabajo);

    expect(store.upsert).toHaveBeenCalledWith(trabajo);
    expect(service.sending().has('15')).toBe(false);
    expect(service.reminded().has('15')).toBe(true);
    expect(notification.success).toHaveBeenCalledWith('Recordatorio enviado', expect.stringContaining('Trabajo 15'));
  });

  it('si ya se recordó hoy lo informa y lo marca como recordado; otro error lo muestra y permite reintentar', () => {
    service.remind(proyecto('15'));
    http.expectOne(`${API}/15/recordatorio-entrega`).flush(cuerpoYaRecordado, yaRecordado);
    expect(notification.info).toHaveBeenCalledWith('Ya se recordó hoy', expect.any(String));
    expect(service.reminded().has('15')).toBe(true);

    service.remind(proyecto('16'));
    http.expectOne(`${API}/16/recordatorio-entrega`).flush({ message: 'Sin permiso' }, { status: 403, statusText: 'Forbidden' });
    expect(notification.error).toHaveBeenCalledWith('No se envió el recordatorio', expect.stringContaining('Trabajo 16'));
    expect(service.reminded().has('16')).toBe(false);
  });

  it('recordar a todos envía a los que faltan y resume el resultado', () => {
    service.reminded.set(new Set(['1']));
    service.remindAll([proyecto('1'), proyecto('2'), proyecto('3')]);

    http.expectNone(`${API}/1/recordatorio-entrega`);
    http.expectOne(`${API}/2/recordatorio-entrega`).flush(crearTrabajoEnCurso());
    http.expectOne(`${API}/3/recordatorio-entrega`).flush(cuerpoYaRecordado, yaRecordado);

    expect(notification.success).toHaveBeenCalledWith('Recordatorios enviados',
      'Se envió el recordatorio a 1 trabajo; 1 ya se había recordado hoy.');
    expect([...service.reminded()].sort()).toEqual(['1', '2', '3']);
  });

  it('si todos ya se recordaron hoy no envía nada', () => {
    service.reminded.set(new Set(['1']));
    service.remindAll([proyecto('1')]);
    expect(notification.info).toHaveBeenCalledWith('Sin recordatorios pendientes', expect.any(String));
  });
});
