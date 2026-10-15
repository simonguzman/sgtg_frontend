import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { NotificationsPageComponent } from '../pages/notifications-page/notifications-page.component';
import { InboxService } from '../services/inbox.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { NotificacionApi } from '../../../core/interfaces/api/notificacion-api.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

const API = '/api/v1/sgtg/notificaciones';

const director: User = {
  id: '1', idType: IdentificationType.CC, idNumber: 1, firstName: 'Dora', lastName: 'Directora',
  secondLastName: '', codeNumber: 1, email: 'dora@unicauca.edu.co', state: UserState.active,
  roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]
};

const notificaciones: NotificacionApi[] = [
  { id: 2, tipo: 'CONFIRMACION', titulo: 'Concepto del Comité de Programa',
    mensaje: 'El Comité de Programa emitió su concepto sobre la propuesta "Sistema de gestión": aprobado.',
    trabajoId: 15, etapa: 'ANTEPROYECTO', fecha: '2026-03-05T09:00:00', leida: false },
  { id: 1, tipo: 'INFO', titulo: 'Trabajo de grado anulado', mensaje: 'El director anuló el trabajo "Otro".',
    trabajoId: 16, etapa: 'CANCELADO', fecha: '2026-03-04T09:00:00', leida: true }
];

describe('Integración [Notifications]: el buzón del backend en la bandeja de entrada', () => {
  let http: HttpTestingController;
  let inbox: InboxService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpTestingController);
    inbox = TestBed.inject(InboxService);
    TestBed.inject(AuthStorageService).setSession(crearJwtDePrueba(), director);
    TestBed.tick();
    jest.advanceTimersByTime(0);
    http.expectOne(API).flush(notificaciones);
    http.match(() => true).forEach(req => req.flush([]));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('la tabla muestra las notificaciones del usuario y el contador de no leídas', () => {
    const fixture = TestBed.createComponent(NotificationsPageComponent);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Concepto del Comité de Programa');
    expect(texto).toContain('Trabajo de grado anulado');
    expect(inbox.unreadCount()).toBe(1);
  });

  it('ver el detalle la marca como leída en el backend y lleva a la vista del trabajo', () => {
    const fixture = TestBed.createComponent(NotificationsPageComponent);
    const navegar = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fila = fixture.componentInstance['facade'].tableData()[0];

    fixture.componentInstance.handleTableAction({ action: 'ver_detalle', row: fila });

    http.expectOne(`${API}/2/leida`).flush({ ...notificaciones[0], leida: true });
    expect(navegar).toHaveBeenCalledWith('/preliminary-draft/details/15');
    expect(inbox.unreadCount()).toBe(0);
  });

  it('una notificación de un trabajo archivado lleva al historial', () => {
    const fixture = TestBed.createComponent(NotificationsPageComponent);
    const navegar = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.handleTableAction({ action: 'ver_detalle',
      row: fixture.componentInstance['facade'].tableData()[1] });
    // Ya estaba leída: no se vuelve a marcar
    http.expectNone(`${API}/1/leida`);
    expect(navegar).toHaveBeenCalledWith('/history');
  });

  it('eliminar una y vaciar la bandeja se confirman y llaman al backend', () => {
    const fixture = TestBed.createComponent(NotificationsPageComponent);
    const page = fixture.componentInstance;

    page.handleTableAction({ action: 'eliminar', row: page['facade'].tableData()[0] });
    page.executePendingAction();
    expect(http.expectOne(`${API}/2`).request.method).toBe('DELETE');
    expect(inbox.messages().map(m => m.id)).toEqual(['1']);

    page.requestClearAll();
    page.executePendingAction();
    expect(http.expectOne(req => req.method === 'DELETE' && req.url === API)).toBeTruthy();
    expect(inbox.messages()).toEqual([]);
  });
});
