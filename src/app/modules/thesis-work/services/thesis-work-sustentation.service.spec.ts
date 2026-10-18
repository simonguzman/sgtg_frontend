import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThesisWorkSustentationService } from './thesis-work-sustentation.service';
import { UserService } from '../../users/services/user.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import {
  crearTrabajoEnAnteproyecto, crearTrabajoEnSustentacion
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

/** Nombre del archivo de cada parte (sin `datos`). */
const nombres = (body: FormData) => {
  const partes: Record<string, string> = {};
  body.forEach((archivo, parte) => { if (parte !== 'datos') partes[parte] = (archivo as File).name; });
  return partes;
};

describe('ThesisWorkSustentationService', () => {
  let service: ThesisWorkSustentationService;
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
    service = TestBed.inject(ThesisWorkSustentationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('la solicitud de sustentación envía monografía, formato E, concepto y anexos (sin paz y salvo)', () => {
    let resultado: ThesisWork | undefined;
    service.requestSustentation('15', {
      monograph: pdf('monografia.pdf'), formatE: pdf('formato-e.pdf'), advisorConcept: null,
      annexes: pdf('anexos.pdf')
    }).subscribe(t => resultado = t);

    const req = http.expectOne(`${API}/15/sustentacion`);
    const body = req.request.body as FormData;
    expect(body.has('datos')).toBe(false);
    expect(nombres(body)).toEqual({
      monografia: 'monografia.pdf', documentoFinal: 'formato-e.pdf', anexos: 'anexos.pdf'
    });
    req.flush(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [] }));

    expect(resultado?.sustentation?.state).toBe('SOLICITADA');
    expect(TestBed.inject(TrabajoGradoStoreService).porId().get('15')?.etapa).toBe('SUSTENTACION');
  });

  it('Decanatura revisa el paz y salvo con el formato F y observaciones', async () => {
    service.reviewPazYSalvo('15', false, ' Deuda en biblioteca ', pdf('formato-f.pdf')).subscribe();
    const req = http.expectOne(`${API}/15/sustentacion/paz-y-salvo`);
    expect(await leerDatos(req.request.body as FormData)).toEqual({ aprobado: false, observaciones: 'Deuda en biblioteca' });
    expect(nombres(req.request.body as FormData)).toEqual({ archivo: 'formato-f.pdf' });
    req.flush(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [], rutaPazYSalvo: null }));
  });

  it('la programación envía coordinador, jurado, fecha y hora, salón y el formato E', async () => {
    service.scheduleSustentation('15', {
      coordinatorId: '30', jurorId: '31', dateTime: '2026-07-15T09:30:00', location: 'Sala 1',
      formatE: pdf('formato-e.pdf')
    }).subscribe();

    const req = http.expectOne(`${API}/15/sustentacion/programacion`);
    const body = req.request.body as FormData;
    expect(await leerDatos(body)).toEqual({
      juradoCoordinadorId: 30, juradoId: 31, fechaHora: '2026-07-15T09:30:00', salon: 'Sala 1'
    });
    expect(nombres(body)).toEqual({ archivo: 'formato-e.pdf' });
    req.flush(crearTrabajoEnSustentacion());

  });

  it('la calificación del coordinador va con el acta', async () => {
    service.gradeSustentation('15', 'APROBADO_CON_OBSERVACIONES', 'Ajustar', pdf('acta.pdf')).subscribe();
    const req = http.expectOne(`${API}/15/sustentacion/calificaciones`);
    expect(await leerDatos(req.request.body as FormData))
      .toEqual({ calificacion: 'APROBADO_CON_OBSERVACIONES', observaciones: 'Ajustar' });
    expect(nombres(req.request.body as FormData)).toEqual({ archivo: 'acta.pdf' });
    req.flush(crearTrabajoEnSustentacion({ estado: 'EN_AJUSTES' }));
  });

  it('la inasistencia se registra con observaciones (JSON)', () => {
    service.registerNonAttendance('15', ' No se presentó ').subscribe();
    const req = http.expectOne(`${API}/15/sustentacion/inasistencia`);
    expect(req.request.body).toEqual({ observaciones: 'No se presentó' });
    req.flush(crearTrabajoEnSustentacion({ estado: 'APLAZADA' }, { etapa: 'APLAZADO' }));
  });

  it('los ajustes del director van con anexos opcionales', () => {
    service.submitAdjustments('15', pdf('ajustes.pdf'), null).subscribe();
    const req = http.expectOne(`${API}/15/sustentacion/ajustes`);
    expect(nombres(req.request.body as FormData)).toEqual({ archivo: 'ajustes.pdf' });
    req.flush(crearTrabajoEnSustentacion({ estado: 'AJUSTES_RADICADOS' }));
  });

  it('la verificación del coordinador indica si cumplen', () => {
    service.verifyAdjustments('15', false, 'Falta el capítulo 3').subscribe();
    const req = http.expectOne(`${API}/15/sustentacion/ajustes/verificaciones`);
    expect(req.request.body).toEqual({ cumple: false, observaciones: 'Falta el capítulo 3' });
    req.flush(crearTrabajoEnSustentacion({ estado: 'APLAZADA' }));
  });

  it('la versión definitiva del coordinador finaliza el trabajo', () => {
    let resultado: ThesisWork | undefined;
    service.uploadFinalVersion('15', pdf('definitiva.pdf')).subscribe(t => resultado = t);
    http.expectOne(`${API}/15/sustentacion/version-definitiva`).flush(crearTrabajoEnSustentacion({
      estado: 'FINALIZADA', rutaVersionDefinitiva: '15/TI-H/v1/definitiva.pdf', fechaVersionDefinitiva: '2026-07-25'
    }, { etapa: 'FINALIZADO' }));
    expect(resultado?.isArchived).toBe(true);
  });

  it('si el backend rechaza no emite eventos; si la respuesta no está en curso, falla', () => {
    let error: unknown;
    service.registerNonAttendance('15', 'x').subscribe({ error: e => error = e });
    http.expectOne(`${API}/15/sustentacion/inasistencia`)
      .flush({ message: 'Solo el jurado coordinador' }, { status: 406, statusText: 'Not Acceptable' });
    expect(error).toBeTruthy();

    service.uploadFinalVersion('15', pdf('d.pdf')).subscribe({ error: e => error = e });
    http.expectOne(`${API}/15/sustentacion/version-definitiva`).flush(crearTrabajoEnAnteproyecto());
    expect(error).toEqual(new Error('El trabajo de grado no está en curso.'));
  });
});
