import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProposalService } from '../services/proposal.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { UsuarioResponse } from '../../../core/interfaces/api/auth-api.interface';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg';

const usuario = (overrides: Partial<User>): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Juan', lastName: 'Perez',
  secondLastName: '', codeNumber: 1234567890, email: 'juan@test.com', state: UserState.active, roles: [], ...overrides
});

const usuarioApi = (roles: string[]): UsuarioResponse => ({
  id: 1, codigo: '1001', tipoDocumento: 'CC', numeroDocumento: '1', email: 'dora@unicauca.edu.co',
  primerNombre: 'Dora', segundoNombre: null, primerApellido: 'Directora', segundoApellido: null,
  roles, activo: true, tipoVinculacion: 'PLANTA', departamento: { id: 1, nombre: 'Sistemas' }, programa: null
});

describe('Integración [Proposal]: Creación contra el backend y roles de contexto', () => {
  let proposalService: ProposalService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    proposalService = TestBed.inject(ProposalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => jest.restoreAllMocks());

  it('crea el trabajo, radica el formato A, refresca los roles asignados por el backend y lo muestra en la lista', () => {
    // Docente sin el rol de director: el backend se lo asigna al crear el trabajo
    iniciarSesionConTrabajos(usuario({ id: '1', roles: [UserRoleType.DOCENTE] }), []);

    let creada: Proposal | undefined;
    proposalService.createProposal({
      title: 'Sistema de gestión',
      description: 'Objetivo general',
      objectives: ['Objetivo general', 'Objetivo específico'],
      modality: Modality.TI,
      authors: [usuario({ id: '10' })],
      director: usuario({ id: '1' }),
      state: stateList.EN_REVISION,
      createdAt: new Date(),
      documents: [],
      evaluations: [],
      attachments: { proposal: new File(['%PDF'], 'formato-a.pdf') }
    } as Proposal).subscribe(propuesta => creada = propuesta);

    http.expectOne(`${API}/trabajos-grado/investigacion`)
      .flush(crearTrabajoDePrueba({ propuesta: { ...crearTrabajoDePrueba().propuesta, versiones: [] } }));
    http.expectOne(req => req.method === 'POST' && req.url === `${API}/trabajos-grado/15/propuesta`)
      .flush(crearTrabajoDePrueba());
    http.expectOne(`${API}/usuarios/me`).flush(usuarioApi(['DOCENTE', 'DIRECTOR']));
    TestBed.tick();

    expect(creada?.id).toBe('15');
    expect(creada?.state).toBe(stateList.EN_REVISION);
    expect(TestBed.inject(AuthService).currentUser()?.roles).toContain(UserRoleType.DIRECTOR);
    expect(proposalService.proposals().map(p => p.id)).toEqual(['15']);
  });
});
