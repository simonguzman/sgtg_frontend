import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThesisWorkMeetingService } from './thesis-work-meeting.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { stateList } from '../../../core/enums/state.enum';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { crearTrabajoEnCursoCon, reunionDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

describe('ThesisWorkMeetingService', () => {
  let service: ThesisWorkMeetingService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ThesisWorkMeetingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('agenda la reunión con la fecha y hora local y actualiza el trabajo', () => {
    let resultado: ThesisWork | undefined;
    service.scheduleMeeting('15', 1, new Date(2026, 3, 20, 10, 30), '  Sala 2  ').subscribe(t => resultado = t);

    const req = http.expectOne(`${API}/15/reuniones/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ fechaHora: '2026-04-20T10:30:00', lugar: 'Sala 2' });
    req.flush(crearTrabajoEnCursoCon({ reuniones: [reunionDePrueba(1, {
      fechaHora: '2026-04-20T10:30:00', lugar: 'Sala 2', estado: 'AGENDADA'
    })] }));

    expect(resultado?.meetings?.[0]).toEqual(expect.objectContaining({
      number: 1, place: 'Sala 2', status: stateList.AGENDADA, scheduledAt: new Date(2026, 3, 20, 10, 30)
    }));
    expect(TestBed.inject(TrabajoGradoStoreService).porId().get('15')?.ejecucion?.reuniones).toHaveLength(1);
  });

  it('registra la reunión como realizada; sin observaciones envía null', () => {
    service.registerMeetingHeld('15', 2, '   ').subscribe();

    const req = http.expectOne(`${API}/15/reuniones/2/realizada`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ observaciones: null });
    req.flush(crearTrabajoEnCursoCon({ reuniones: [reunionDePrueba(2, { realizada: true, estado: 'REALIZADA' })] }));
  });
});
