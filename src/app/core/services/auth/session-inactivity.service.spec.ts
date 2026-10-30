import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { CLAVE_ULTIMA_ACTIVIDAD, MINUTOS_INACTIVIDAD, SessionInactivityService } from './session-inactivity.service';

const MINUTO = 60_000;

describe('SessionInactivityService', () => {
  let service: SessionInactivityService;
  let alInactivar: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionInactivityService);
    alInactivar = jest.fn();
  });

  afterEach(() => service.detener());

  it(`cierra la sesión tras ${MINUTOS_INACTIVIDAD} minutos sin actividad`, fakeAsync(() => {
    service.iniciar(alInactivar);
    tick((MINUTOS_INACTIVIDAD - 1) * MINUTO);
    expect(alInactivar).not.toHaveBeenCalled();

    tick(MINUTO);
    expect(alInactivar).toHaveBeenCalledTimes(1);
    // Deja de vigilar y olvida la actividad
    expect(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)).toBeNull();
    tick(MINUTOS_INACTIVIDAD * MINUTO);
    expect(alInactivar).toHaveBeenCalledTimes(1);
  }));

  it('la actividad del usuario reinicia el tiempo', fakeAsync(() => {
    service.iniciar(alInactivar);
    tick(20 * MINUTO);
    document.dispatchEvent(new KeyboardEvent('keydown'));
    tick(20 * MINUTO);
    expect(alInactivar).not.toHaveBeenCalled();

    tick(10 * MINUTO);
    expect(alInactivar).toHaveBeenCalledTimes(1);
  }));

  it('cuenta la actividad de otras pestañas', fakeAsync(() => {
    service.iniciar(alInactivar);
    tick(25 * MINUTO);
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()));
    tick(25 * MINUTO);
    expect(alInactivar).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));

  it('al abrir la aplicación con una sesión inactiva hace tiempo, la cierra enseguida', fakeAsync(() => {
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now() - (MINUTOS_INACTIVIDAD + 5) * MINUTO));
    service.iniciar(alInactivar);
    tick(0);
    expect(alInactivar).toHaveBeenCalledTimes(1);
  }));

  it('detener deja de vigilar', fakeAsync(() => {
    service.iniciar(alInactivar);
    service.detener();
    tick(2 * MINUTOS_INACTIVIDAD * MINUTO);
    expect(alInactivar).not.toHaveBeenCalled();
  }));
});
