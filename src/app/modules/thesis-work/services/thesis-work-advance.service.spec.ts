import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import {
  crearTrabajoEnAnteproyecto, crearTrabajoEnCursoCon, informeDePrueba, revisionDePrueba
} from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

/** Lee el JSON de la parte `datos` de un multipart. */
const leerDatos = (body: FormData): Promise<unknown> => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(JSON.parse(lector.result as string));
  lector.onerror = reject;
  lector.readAsText(body.get('datos') as Blob);
});

describe('ThesisWorkAdvanceService', () => {
  let service: ThesisWorkAdvanceService;
  let http: HttpTestingController;
  let eventBus: { emit: jest.Mock };

  beforeEach(() => {
    localStorage.clear();
    eventBus = { emit: jest.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: EventBusService, useValue: eventBus }]
    });
    service = TestBed.inject(ThesisWorkAdvanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('radicarInforme', () => {
    it('envía el informe con las observaciones y actualiza el trabajo', async () => {
      let resultado: ThesisWork | undefined;
      service.radicarInforme('15', pdf('informe.pdf'), '  Primer mes  ').subscribe(t => resultado = t);

      const req = http.expectOne(`${API}/15/informes-mensuales`);
      const body = req.request.body as FormData;
      expect((body.get('archivo') as File).name).toBe('informe.pdf');
      expect(await leerDatos(body)).toEqual({ observaciones: 'Primer mes' });
      req.flush(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1, { observaciones: 'Primer mes' })] }));

      expect(resultado?.advances?.[0]).toEqual(expect.objectContaining({ id: '1', status: stateList.EN_REVISION }));
      expect(TestBed.inject(TrabajoGradoStoreService).porId().get('15')?.ejecucion?.informesMensuales).toHaveLength(1);
      expect(eventBus.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: AppEventType.THESIS_ADVANCE_UPLOADED,
        targetUserIds: ['10', '1'],
        payload: expect.objectContaining({ thesisWorkId: '15', title: 'Informe mensual 1' })
      }));
    });

    it('sin observaciones no envía la parte datos', () => {
      service.radicarInforme('15', pdf('informe.pdf'), '   ').subscribe();
      const req = http.expectOne(`${API}/15/informes-mensuales`);
      expect((req.request.body as FormData).has('datos')).toBe(false);
      req.flush(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1)] }));
    });

    it('si el backend lo rechaza no emite eventos', () => {
      let error: unknown;
      service.radicarInforme('15', pdf('informe.pdf'), '').subscribe({ error: e => error = e });
      http.expectOne(`${API}/15/informes-mensuales`)
        .flush({ message: 'Los informes mensuales los radican los estudiantes del trabajo' },
          { status: 406, statusText: 'Not Acceptable' });

      expect(error).toBeTruthy();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('falla si la respuesta no corresponde a un trabajo en curso', () => {
      let error: unknown;
      service.radicarInforme('15', pdf('informe.pdf'), '').subscribe({ error: e => error = e });
      http.expectOne(`${API}/15/informes-mensuales`).flush(crearTrabajoEnAnteproyecto());
      expect(error).toEqual(new Error('El trabajo de grado no está en curso.'));
    });
  });

  describe('revisarInforme', () => {
    it('envía las observaciones y las notas al informe indicado', async () => {
      let resultado: ThesisWork | undefined;
      service.revisarInforme('15', '1', 'Ajustar el cronograma', pdf('notas.pdf')).subscribe(t => resultado = t);

      const req = http.expectOne(`${API}/15/informes-mensuales/1/revisiones`);
      const body = req.request.body as FormData;
      expect((body.get('archivo') as File).name).toBe('notas.pdf');
      expect(await leerDatos(body)).toEqual({ observaciones: 'Ajustar el cronograma' });
      req.flush(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1, { revisiones: [revisionDePrueba()] })] }));

      expect(resultado?.advances?.[0].status).toBe(stateList.EVALUADO);
      expect(resultado?.evaluations).toHaveLength(1);
      expect(eventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: AppEventType.THESIS_ADVANCE_EVALUATED }));
    });

    it('solo con el PDF de notas no envía observaciones', () => {
      service.revisarInforme('15', '2', '', pdf('notas.pdf')).subscribe();
      const req = http.expectOne(`${API}/15/informes-mensuales/2/revisiones`);
      const body = req.request.body as FormData;
      expect(body.has('datos')).toBe(false);
      expect(body.has('archivo')).toBe(true);
      req.flush(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1), informeDePrueba(2)] }));
    });
  });
});
