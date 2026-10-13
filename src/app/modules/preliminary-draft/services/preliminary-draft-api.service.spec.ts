import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftApiService } from './preliminary-draft-api.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserState } from '../../users/enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { crearTrabajoConAnteproyectoRadicado } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const jefe: User = {
  id: '60', idType: 'CC', idNumber: 1, firstName: 'Jefe', lastName: 'Dep', secondLastName: '', codeNumber: 1,
  roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP], email: 'jefe@unicauca.edu.co', state: UserState.active
};

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('PreliminaryDraftApiService', () => {
  let service: PreliminaryDraftApiService;
  let http: HttpTestingController;
  let eventBus: { emit: jest.Mock };

  beforeEach(() => {
    localStorage.clear();
    eventBus = { emit: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { users: signal([jefe]) } },
        { provide: EventBusService, useValue: eventBus }
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
    const evento = eventBus.emit.mock.calls[0][0];
    expect(evento.type).toBe(AppEventType.PRELIMINARY_DRAFT_CREATED);
    expect(evento.targetUserIds).toEqual(expect.arrayContaining(['1', '10', '60']));
  });

  it('sin documento no llama al backend', () => {
    let error: Error | undefined;
    service.createPreliminaryDraft({ proposalId: '15' } as PreliminaryDraft).subscribe({ error: e => error = e });
    expect(error?.message).toBe('Debe adjuntar el documento del anteproyecto.');
  });

  it('corregir radica una nueva versión', () => {
    service.updatePreliminaryDraft('15', { attachment: pdf('anteproyecto-v2.pdf') } as PreliminaryDraft).subscribe();

    const req = http.expectOne(`${API}/15/anteproyecto`);
    expect(((req.request.body as FormData).get('archivo') as File).name).toBe('anteproyecto-v2.pdf');
    req.flush(crearTrabajoConAnteproyectoRadicado());
    expect(eventBus.emit.mock.calls[0][0].type).toBe(AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED);
  });

  it('corregir sin un archivo nuevo no llama al backend', () => {
    let error: Error | undefined;
    service.updatePreliminaryDraft('15', {} as PreliminaryDraft).subscribe({ error: e => error = e });
    expect(error?.message).toBe('Adjunte la nueva versión del anteproyecto.');
  });

  it('eliminar no está soportado por el backend', () => {
    let error: Error | undefined;
    service.deleteDraft('15').subscribe({ error: e => error = e });
    expect(error?.message).toContain('se cancela ante el Consejo');
  });
});
