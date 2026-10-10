import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrabajoGradoApiService } from './trabajo-grado-api.service';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

/** jsdom no implementa Blob.text(): se lee con FileReader. */
function leerTexto(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.readAsText(blob);
  });
}

describe('TrabajoGradoApiService', () => {
  let service: TrabajoGradoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TrabajoGradoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta los trabajos propios, todos, por etapa y uno', () => {
    service.misTrabajos().subscribe();
    http.expectOne(`${API}/mis-trabajos`).flush([]);

    service.todos().subscribe();
    http.expectOne(API).flush([]);

    service.porEtapa('ANTEPROYECTO').subscribe();
    http.expectOne(`${API}?etapa=ANTEPROYECTO`).flush([]);

    let id = 0;
    service.consultar('15').subscribe(trabajo => id = trabajo.id);
    http.expectOne(`${API}/15`).flush(crearTrabajoDePrueba());
    expect(id).toBe(15);
  });

  it('arma la URL de descarga con la ruta codificada', () => {
    expect(service.urlArchivo(15, '15/TI-A/v1/mi propuesta.pdf'))
      .toBe(`${API}/15/archivos?ruta=15%2FTI-A%2Fv1%2Fmi%20propuesta.pdf`);
  });

  it('envía operaciones JSON', () => {
    service.enviarJson(15, 'anteproyecto/evaluadores', { evaluador1Id: 20, evaluador2Id: 21 }).subscribe();
    const req = http.expectOne(`${API}/15/anteproyecto/evaluadores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ evaluador1Id: 20, evaluador2Id: 21 });
    req.flush(crearTrabajoDePrueba());

    service.enviarJson(null, 'investigacion', { titulo: 'T' }).subscribe();
    http.expectOne(`${API}/investigacion`).flush(crearTrabajoDePrueba());
  });

  it('envía operaciones multipart: datos como JSON y solo los archivos presentes', async () => {
    const archivo = new File(['%PDF-1.4'], 'resolucion.pdf', { type: 'application/pdf' });
    service.enviarArchivos(15, 'anteproyecto/decisiones-consejo', { resultado: 'APROBADO' },
      { archivo, otro: null }).subscribe();

    const req = http.expectOne(`${API}/15/anteproyecto/decisiones-consejo`);
    const cuerpo = req.request.body as FormData;
    expect(cuerpo instanceof FormData).toBe(true);
    expect((cuerpo.get('archivo') as File).name).toBe('resolucion.pdf');
    expect(cuerpo.has('otro')).toBe(false);
    const datos = cuerpo.get('datos') as Blob;
    expect(datos.type).toBe('application/json');
    expect(JSON.parse(await leerTexto(datos))).toEqual({ resultado: 'APROBADO' });
    req.flush(crearTrabajoDePrueba());
  });

  it('una operación multipart sin datos no envía la parte "datos"', () => {
    service.enviarArchivos(15, 'propuesta', null, { archivo: new File(['%PDF'], 'p.pdf') }).subscribe();
    const req = http.expectOne(`${API}/15/propuesta`);
    expect((req.request.body as FormData).has('datos')).toBe(false);
    req.flush(crearTrabajoDePrueba());
  });
});
