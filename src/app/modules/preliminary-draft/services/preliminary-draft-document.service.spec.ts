import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftDocumentService } from './preliminary-draft-document.service';
import { UserService } from '../../users/services/user.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { crearTrabajoConAnteproyectoRadicado, crearTrabajoEnCurso, crearTrabajoEnEvaluacion } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

/** Lee el JSON de la parte `datos` de un multipart. */
const leerDatos = (body: FormData): Promise<unknown> => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(JSON.parse(lector.result as string));
  lector.onerror = reject;
  lector.readAsText(body.get('datos') as Blob);
});

describe('PreliminaryDraftDocumentService', () => {
  let service: PreliminaryDraftDocumentService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { users: signal([]) } }
      ]
    });
    service = TestBed.inject(PreliminaryDraftDocumentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('registerEvaluatorConcept', () => {
    it('envía el concepto con el formato B y actualiza el trabajo', async () => {
      let resultado: PreliminaryDraft | undefined;
      service.registerEvaluatorConcept('15', 'CON_CORRECCIONES', 'Ajustar el cronograma', pdf('formato-b.pdf'),
        pdf('notas.pdf'))
        .subscribe(anteproyecto => resultado = anteproyecto);

      const req = http.expectOne(`${API}/15/anteproyecto/conceptos`);
      const body = req.request.body as FormData;
      expect((body.get('archivo') as File).name).toBe('formato-b.pdf');
      expect((body.get('anotaciones') as File).name).toBe('notas.pdf');
      expect(await leerDatos(body)).toEqual({ resultado: 'CON_CORRECCIONES', observaciones: 'Ajustar el cronograma' });
      req.flush(crearTrabajoEnEvaluacion());

      expect(resultado?.preliminaryDraftId).toBe('15');
      expect(TestBed.inject(TrabajoGradoStoreService).porId().get('15')?.etapa).toBe('EVALUACION');
    });

    it('si el backend lo rechaza no emite eventos', () => {
      let error: unknown;
      service.registerEvaluatorConcept('15', 'APROBADO', '', pdf('b.pdf')).subscribe({ error: e => error = e });
      http.expectOne(`${API}/15/anteproyecto/conceptos`)
        .flush({ message: 'Solo los evaluadores asignados' }, { status: 406, statusText: 'Not Acceptable' });

      expect(error).toBeTruthy();
    });
  });

  it('uploadCorrection radica una nueva versión del anteproyecto', () => {
    service.uploadCorrection('15', pdf('anteproyecto-v2.pdf')).subscribe();

    const req = http.expectOne(`${API}/15/anteproyecto`);
    const body = req.request.body as FormData;
    expect((body.get('archivo') as File).name).toBe('anteproyecto-v2.pdf');
    expect(body.has('datos')).toBe(false);
    req.flush(crearTrabajoConAnteproyectoRadicado());
  });

  it('el Jefe remite el anteproyecto al Consejo con el formato C', () => {
    let resultado: PreliminaryDraft | undefined;
    service.uploadCouncilPresentation('15', pdf('formato-c.pdf')).subscribe(anteproyecto => resultado = anteproyecto);

    const req = http.expectOne(`${API}/15/anteproyecto/remision`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect((body.get('archivo') as File).name).toBe('formato-c.pdf');
    expect(body.has('datos')).toBe(false);
    req.flush(crearTrabajoEnEvaluacion({ etapa: 'APROBACION_CONSEJO' }));

    expect(resultado?.preliminaryDraftId).toBe('15');
  });

  describe('registerCouncilDecision', () => {
    it('envía la decisión del Consejo con la resolución', async () => {
      let resultado: PreliminaryDraft | undefined;
      service.registerCouncilDecision('15', stateList.APROBADO, 'Cumple', pdf('resolucion.pdf'))
        .subscribe(anteproyecto => resultado = anteproyecto);

      const req = http.expectOne(`${API}/15/anteproyecto/decisiones-consejo`);
      const body = req.request.body as FormData;
      expect((body.get('archivo') as File).name).toBe('resolucion.pdf');
      expect(await leerDatos(body)).toEqual({ resultado: 'APROBADO', observaciones: 'Cumple' });
      req.flush(crearTrabajoEnCurso());

      expect(resultado?.state).toBe(stateList.APROBADO);
    });

    it('cualquier otro veredicto se envía como NO_APROBADO, sin observaciones vacías', async () => {
      service.registerCouncilDecision('15', stateList.APROBADO_CON_OBSERVACIONES, '', pdf('r.pdf')).subscribe();
      const req = http.expectOne(`${API}/15/anteproyecto/decisiones-consejo`);
      expect(await leerDatos(req.request.body as FormData)).toEqual({ resultado: 'NO_APROBADO', observaciones: null });
      req.flush(crearTrabajoConAnteproyectoRadicado());
    });
  });

  describe('calculateDocumentStatus', () => {
    const evaluacion = (documentId: string, veredict: stateList) => ({ documentId, veredict } as Evaluation);

    it('queda en revisión mientras falten conceptos', () => {
      expect(service.calculateDocumentStatus('d1', [evaluacion('d1', stateList.APROBADO)], 2)).toBe(stateList.EN_REVISION);
      expect(service.calculateDocumentStatus('d1', [], 0)).toBe(stateList.EN_REVISION);
    });

    it('aprobado si todos aprueban; no aprobado si alguno no', () => {
      expect(service.calculateDocumentStatus('d1',
        [evaluacion('d1', stateList.APROBADO), evaluacion('d1', stateList.APROBADO)], 2)).toBe(stateList.APROBADO);
      expect(service.calculateDocumentStatus('d1',
        [evaluacion('d1', stateList.APROBADO), evaluacion('d1', stateList.NO_APROBADO)], 2)).toBe(stateList.NO_APROBADO);
    });
  });
});
