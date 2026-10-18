import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { UserService } from '../../users/services/user.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { SpecialRequest } from '../interfaces/special-request.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { crearTrabajoEnCurso, crearTrabajoEnCursoCon } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

/** Lee el JSON de la parte `datos` de un multipart. */
const leerDatos = (body: FormData): Promise<unknown> => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(JSON.parse(lector.result as string));
  lector.onerror = reject;
  lector.readAsText(body.get('datos') as Blob);
});

const solicitud = (requestType: SpecialRequestType): SpecialRequest => ({
  id: 'x-0', directorId: '1', requestType, requestDate: new Date(), description: '', status: stateList.EN_REVISION
});

describe('ThesisWorkSpecialRequestService', () => {
  let service: ThesisWorkSpecialRequestService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { users: signal([{ id: '50', roles: [UserRoleType.CONSEJO] }]) } }
      ]
    });
    service = TestBed.inject(ThesisWorkSpecialRequestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('createSpecialRequest', () => {
    it('el cambio de título y objetivos se envía como JSON y notifica al Consejo', () => {
      let resultado: ThesisWork | undefined;
      service.createSpecialRequest('15', {
        requestType: SpecialRequestType.CAMBIO_TITULO, title: 'Nuevo', objectives: ['G', 'E'], justification: 'Alcance'
      }).subscribe(t => resultado = t);

      const req = http.expectOne(`${API}/15/cambio-objetivos`);
      expect(req.request.body).toEqual({ titulo: 'Nuevo', objetivos: ['G', 'E'], justificacion: 'Alcance' });
      req.flush(crearTrabajoEnCursoCon({ cambiosObjetivos: [{ tituloAnterior: 'Sistema de gestión',
        objetivosAnteriores: [], tituloPropuesto: 'Nuevo', objetivosPropuestos: ['G', 'E'], justificacion: 'Alcance',
        fechaSolicitud: '2026-05-01', decision: null }] }));

      expect(resultado?.specialRequests[0].requestType).toBe(SpecialRequestType.CAMBIO_TITULO);
      expect(TestBed.inject(TrabajoGradoStoreService).porId().get('15')).toBeTruthy();
    });

    it('la prórroga envía los meses y el documento', async () => {
      service.createSpecialRequest('15', {
        requestType: SpecialRequestType.PRORROGA, months: 2, document: pdf('prorroga.pdf')
      }).subscribe();

      const req = http.expectOne(`${API}/15/prorroga`);
      const body = req.request.body as FormData;
      expect(await leerDatos(body)).toEqual({ meses: 2 });
      expect((body.get('archivo') as File).name).toBe('prorroga.pdf');
      req.flush(crearTrabajoEnCurso());
    });

    it.each([
      [SpecialRequestType.SUSPENSION, 'suspension'],
      [SpecialRequestType.CANCELACION, 'cancelacion'],
      [SpecialRequestType.REANUDACION, 'suspension/reanudacion']
    ] as const)('%s envía solo el documento a %s', (requestType, operacion) => {
      service.createSpecialRequest('15', { requestType, document: pdf('doc.pdf') }).subscribe();

      const req = http.expectOne(`${API}/15/${operacion}`);
      const body = req.request.body as FormData;
      expect(body.has('datos')).toBe(false);
      expect((body.get('archivo') as File).name).toBe('doc.pdf');
      req.flush(crearTrabajoEnCurso());
    });

    it('la reanudación notifica la reactivación a los participantes (sin el Consejo)', () => {
      service.createSpecialRequest('15', { requestType: SpecialRequestType.REANUDACION, document: pdf('r.pdf') })
        .subscribe();
      http.expectOne(`${API}/15/suspension/reanudacion`).flush(crearTrabajoEnCurso());

    });
  });

  describe('evaluateSpecialRequest', () => {
    it.each([
      [SpecialRequestType.CAMBIO_TITULO, 'cambio-objetivos'],
      [SpecialRequestType.PRORROGA, 'prorroga'],
      [SpecialRequestType.SUSPENSION, 'suspension'],
      [SpecialRequestType.CANCELACION, 'cancelacion']
    ] as const)('la decisión sobre %s va a %s/decisiones-consejo con la resolución', async (tipo, operacion) => {
      service.evaluateSpecialRequest('15', solicitud(tipo), {
        status: stateList.NO_APROBADO, resolutionDetails: ' ', resolution: pdf('resolucion.pdf')
      }).subscribe();

      const req = http.expectOne(`${API}/15/${operacion}/decisiones-consejo`);
      const body = req.request.body as FormData;
      expect(await leerDatos(body)).toEqual({ resultado: 'NO_APROBADO', observaciones: null });
      expect((body.get('archivo') as File).name).toBe('resolucion.pdf');
      req.flush(crearTrabajoEnCurso());

    });

    it('envía APROBADO con las observaciones', async () => {
      service.evaluateSpecialRequest('15', solicitud(SpecialRequestType.PRORROGA), {
        status: stateList.APROBADO, resolutionDetails: 'Procede', resolution: pdf('r.pdf')
      }).subscribe();
      const req = http.expectOne(`${API}/15/prorroga/decisiones-consejo`);
      expect(await leerDatos(req.request.body as FormData)).toEqual({ resultado: 'APROBADO', observaciones: 'Procede' });
      req.flush(crearTrabajoEnCurso());
    });

    it('la reanudación no la decide el Consejo', () => {
      expect(() => service.evaluateSpecialRequest('15', solicitud(SpecialRequestType.REANUDACION), {
        status: stateList.APROBADO, resolutionDetails: '', resolution: pdf('r.pdf')
      })).toThrow('no la decide el Consejo');
    });
  });
});
