import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ProposalApiService } from './proposal-api.service';
import { ProposalStorageService } from './proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AuthApiService } from '../../../core/services/auth/auth-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (id: string, roles: UserRoleType[] = []): User => ({
  id, idType: 'CC', idNumber: 1, firstName: 'U' + id, lastName: 'P', secondLastName: '', codeNumber: 1,
  roles, email: `u${id}@unicauca.edu.co`, state: UserState.active
});

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

const leerDatos = (body: FormData): Promise<unknown> => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(JSON.parse(lector.result as string));
  lector.onerror = reject;
  lector.readAsText(body.get('datos') as Blob);
});

const propuestaNueva = (overrides: Partial<Proposal> = {}): Proposal => ({
  title: 'Sistema de gestión',
  description: 'Objetivo general',
  objectives: ['Objetivo general', 'Objetivo específico'],
  lineOfResearch: 'Ingeniería de software',
  modality: Modality.TI,
  authors: [usuario('10'), usuario('11')],
  director: usuario('1'),
  codirector: usuario('2'),
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  attachments: { proposal: pdf('formato-a.pdf') },
  ...overrides
} as Proposal);

describe('ProposalApiService', () => {
  let service: ProposalApiService;
  let http: HttpTestingController;
  let store: TrabajoGradoStoreService;
  let eventBus: { emit: jest.Mock };
  let userService: { users: ReturnType<typeof signal<User[]>>; loadUsers: jest.Mock };
  let authApi: { refreshCurrentUser: jest.Mock };
  let storage: { getById: jest.Mock; getProposalsListSnapshot: jest.Mock };

  beforeEach(() => {
    localStorage.clear();
    eventBus = { emit: jest.fn() };
    userService = { users: signal([usuario('30', [UserRoleType.COMITE])]), loadUsers: jest.fn() };
    authApi = { refreshCurrentUser: jest.fn().mockReturnValue(of(undefined)) };
    storage = { getById: jest.fn(), getProposalsListSnapshot: jest.fn().mockReturnValue([]) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EventBusService, useValue: eventBus },
        { provide: UserService, useValue: userService },
        { provide: AuthApiService, useValue: authApi },
        { provide: ProposalStorageService, useValue: storage }
      ]
    });
    service = TestBed.inject(ProposalApiService);
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(TrabajoGradoStoreService);
  });

  afterEach(() => http.verify());

  it('getProposalByIdMock delega en el almacenamiento', done => {
    const propuesta = { id: '15' } as Proposal;
    storage.getById.mockReturnValue(of(propuesta));
    service.getProposalByIdMock('15').subscribe(resultado => {
      expect(resultado).toBe(propuesta);
      done();
    });
  });

  describe('createProposalMock', () => {
    it('crea el trabajo de investigación, radica el formato A, refresca roles y notifica', () => {
      let resultado: Proposal | undefined;
      service.createProposalMock(propuestaNueva()).subscribe(propuesta => resultado = propuesta);

      const creacion = http.expectOne(`${API}/investigacion`);
      expect(creacion.request.method).toBe('POST');
      expect(creacion.request.body).toEqual({
        titulo: 'Sistema de gestión',
        objetivos: ['Objetivo general', 'Objetivo específico'],
        descripcion: null,
        lineaInvestigacion: 'Ingeniería de software',
        estudiantesIds: [10, 11],
        codirectorId: 2,
        asesor: null
      });
      creacion.flush(crearTrabajoDePrueba({ propuesta: { ...crearTrabajoDePrueba().propuesta, versiones: [] } }));

      const radicacion = http.expectOne(`${API}/15/propuesta`);
      expect((radicacion.request.body as FormData).get('archivo')).toBeInstanceOf(File);
      radicacion.flush(crearTrabajoDePrueba());

      expect(resultado?.id).toBe('15');
      expect(store.porId().get('15')?.propuesta.versiones).toHaveLength(1);
      expect(authApi.refreshCurrentUser).toHaveBeenCalled();
      expect(userService.loadUsers).toHaveBeenCalled();
      const evento = eventBus.emit.mock.calls[0][0];
      expect(evento.type).toBe(AppEventType.PROPOSAL_CREATED);
      expect(evento.targetUserIds).toEqual(expect.arrayContaining(['10', '1', '30']));
    });

    it('crea la práctica profesional con la carta de aceptación y el asesor', async () => {
      const carta = pdf('carta.pdf');
      service.createProposalMock(propuestaNueva({
        modality: Modality.PP,
        authors: [usuario('10')],
        codirector: undefined,
        advisor: usuario('40', [UserRoleType.ASESOR]),
        organization: 'Empresa S.A.',
        description: 'Descripción general',
        attachments: { proposal: pdf('formato-a.pdf'), acceptanceLetter: carta }
      })).subscribe();

      const creacion = http.expectOne(`${API}/practica-profesional`);
      const body = creacion.request.body as FormData;
      expect((body.get('archivo') as File).name).toBe('carta.pdf');
      expect(await leerDatos(body)).toEqual({
        titulo: 'Sistema de gestión',
        objetivos: ['Objetivo general', 'Objetivo específico'],
        descripcion: 'Descripción general',
        lineaInvestigacion: 'Ingeniería de software',
        estudianteId: 10,
        codirectorId: null,
        asesor: { usuarioId: 40, organizacion: 'Empresa S.A.', externo: false }
      });
      creacion.flush(crearTrabajoDePrueba({ modalidad: 'PRACTICA_PROFESIONAL' }));
      http.expectOne(`${API}/15/propuesta`).flush(crearTrabajoDePrueba({ modalidad: 'PRACTICA_PROFESIONAL' }));
    });

    it('sin formato A no llama al backend', () => {
      let error: Error | undefined;
      service.createProposalMock(propuestaNueva({ attachments: {} })).subscribe({ error: e => error = e });
      expect(error?.message).toBe('Debe adjuntar el formato de la propuesta.');
    });

    it('si falla la creación no radica ni notifica', () => {
      let error: unknown;
      service.createProposalMock(propuestaNueva()).subscribe({ error: e => error = e });
      http.expectOne(`${API}/investigacion`).flush({ mensaje: 'Datos inválidos' }, { status: 400, statusText: 'Bad Request' });

      expect(error).toBeTruthy();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('updateProposalMock', () => {
    it('corrige los datos de la propuesta sin radicar si no hay nuevo archivo', () => {
      const actual = propuestaNueva({ id: '15', attachments: undefined });
      storage.getProposalsListSnapshot.mockReturnValue([actual]);
      let resultado: Proposal | undefined;
      service.updateProposalMock('15', { title: 'Nuevo título' }).subscribe(propuesta => resultado = propuesta);

      const req = http.expectOne(`${API}/15/propuesta`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        titulo: 'Nuevo título',
        objetivos: ['Objetivo general', 'Objetivo específico'],
        descripcion: null,
        lineaInvestigacion: 'Ingeniería de software'
      });
      req.flush(crearTrabajoDePrueba({ titulo: 'Nuevo título' }));

      expect(resultado?.title).toBe('Nuevo título');
    });

    it('con un nuevo formato A lo radica como nueva versión', () => {
      storage.getProposalsListSnapshot.mockReturnValue([propuestaNueva({ id: '15', attachments: undefined })]);
      service.updateProposalMock('15', { attachments: { proposal: pdf('v2.pdf') } }).subscribe();

      http.expectOne(req => req.method === 'PUT' && req.url === `${API}/15/propuesta`).flush(crearTrabajoDePrueba());
      const radicacion = http.expectOne(req => req.method === 'POST' && req.url === `${API}/15/propuesta`);
      expect(((radicacion.request.body as FormData).get('archivo') as File).name).toBe('v2.pdf');
      radicacion.flush(crearTrabajoDePrueba());
    });
  });

  it('deleteProposalMock no está soportado por el backend', () => {
    let error: Error | undefined;
    service.deleteProposalMock('15').subscribe({ error: e => error = e });
    expect(error?.message).toContain('se cancela ante el Consejo');
  });
});
