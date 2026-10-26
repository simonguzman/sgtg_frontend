import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftApiService } from './preliminary-draft-api.service';
import { UserService } from '../../users/services/user.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserState } from '../../users/enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { crearTrabajoConAnteproyectoRadicado, crearTrabajoEnAnteproyecto } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const jefe: User = {
  id: '60', idType: 'CC', idNumber: 1, firstName: 'Jefe', lastName: 'Dep', secondLastName: '', codeNumber: 1,
  roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP], email: 'jefe@unicauca.edu.co', state: UserState.active
};

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('PreliminaryDraftApiService', () => {
  let service: PreliminaryDraftApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { users: signal([jefe]) } }
      ]
    });
    service = TestBed.inject(PreliminaryDraftApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registrar el anteproyecto radica su primera versión sobre el trabajo de la propuesta', () => {
    let creado: PreliminaryDraft | undefined;
    service.createPreliminaryDraft({ proposalId: '15', attachment: pdf('anteproyecto.pdf') } as PreliminaryDraft)
      .subscribe(anteproyecto => creado = anteproyecto);

    const req = http.expectOne(`${API}/15/anteproyecto`);
    expect(req.request.method).toBe('POST');
    expect(((req.request.body as FormData).get('archivo') as File).name).toBe('anteproyecto.pdf');
    req.flush(crearTrabajoConAnteproyectoRadicado());

    expect(creado?.preliminaryDraftId).toBe('15');
    expect(creado?.documents[0].status).toBe(stateList.EN_REVISION);
  });

  it('sin documento no llama al backend', () => {
    let error: Error | undefined;
    service.createPreliminaryDraft({ proposalId: '15' } as PreliminaryDraft).subscribe({ error: e => error = e });
    expect(error?.message).toBe('Debe adjuntar el documento del anteproyecto.');
  });

  const corregido = (attachment: File | null) => ({
    attachment,
    proposalData: { title: 'Título corregido', objectives: ['General', 'Específico'], description: 'Descripción',
      lineOfResearch: 'IA' }
  }) as PreliminaryDraft;

  it('corregir guarda los datos del trabajo y radica el nuevo documento como nueva versión', () => {
    service.updatePreliminaryDraft('15', corregido(pdf('anteproyecto-v2.pdf'))).subscribe();

    const datos = http.expectOne({ method: 'PUT', url: `${API}/15/anteproyecto` });
    expect(datos.request.body).toEqual({ titulo: 'Título corregido', objetivos: ['General', 'Específico'],
      descripcion: 'Descripción', lineaInvestigacion: 'IA' });
    datos.flush(crearTrabajoConAnteproyectoRadicado());

    const req = http.expectOne({ method: 'POST', url: `${API}/15/anteproyecto` });
    expect(((req.request.body as FormData).get('archivo') as File).name).toBe('anteproyecto-v2.pdf');
    req.flush(crearTrabajoConAnteproyectoRadicado());
  });

  it('corregir sin un documento nuevo solo guarda los datos', () => {
    let terminado = false;
    service.updatePreliminaryDraft('15', corregido(null)).subscribe(() => terminado = true);

    http.expectOne({ method: 'PUT', url: `${API}/15/anteproyecto` }).flush(crearTrabajoConAnteproyectoRadicado());
    http.expectNone({ method: 'POST', url: `${API}/15/anteproyecto` });
    expect(terminado).toBe(true);
  });

  it('anular envía la justificación al backend', () => {
    let terminado = false;
    service.annulDraft('15', 'Sin financiación').subscribe(() => terminado = true);
    const req = http.expectOne(`${API}/15/anulacion`);
    expect(req.request.body).toEqual({ justificacion: 'Sin financiación' });
    req.flush(crearTrabajoEnAnteproyecto({ etapa: 'CANCELADO', motivoCierre: 'ANULACION_DIRECTOR' }));
    expect(terminado).toBe(true);
  });
});
