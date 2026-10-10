import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProposalStorageService } from './proposal-storage.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { UserState } from '../../users/enum/user-state.enum';
import { Proposal } from '../interfaces/proposal.interface';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: 'CC', idNumber: 1, firstName: 'U', lastName: 'P', secondLastName: '', codeNumber: 1,
  roles, email: 'u@unicauca.edu.co', state: UserState.active
});

describe('ProposalStorageService', () => {
  let service: ProposalStorageService;
  let auth: AuthStorageService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProposalStorageService);
    auth = TestBed.inject(AuthStorageService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  const iniciarSesion = (user: User) => {
    auth.setSession(crearJwtDePrueba(), user);
    TestBed.tick();
  };

  it('sin sesión no hay propuestas ni carga', () => {
    expect(service.proposals()).toEqual([]);
    expect(service.isHydrated()).toBe(false);
  });

  it('expone como propuestas los trabajos del backend, con el id del trabajo', () => {
    iniciarSesion(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]));
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    expect(service.isHydrated()).toBe(true);
    expect(service.proposals().map(p => p.id)).toEqual(['15']);
    expect(service.getProposalsListSnapshot()).toHaveLength(1);
  });

  it('el Comité ve todas las propuestas aunque no participe', () => {
    iniciarSesion(usuario('99', [UserRoleType.DOCENTE, UserRoleType.COMITE]));
    http.expectOne(API).flush([crearTrabajoDePrueba(), crearTrabajoDePrueba({ id: 16 })]);

    expect(service.hasPrivilegedAccess()).toBe(true);
    expect(service.proposals().map(p => p.id)).toEqual(['15', '16']);
  });

  it('otros roles solo ven las propuestas en las que participan', () => {
    iniciarSesion(usuario('99', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]));
    http.expectOne(API).flush([crearTrabajoDePrueba()]);

    expect(service.proposals()).toEqual([]);
    expect(service.allProposals()).toHaveLength(1);
  });

  it('canUserAccessProposal reconoce a autores, director, codirector y asesor', () => {
    const propuesta = {
      authors: [{ id: '10' }], director: { id: '1' }, codirector: { id: '2' }, advisor: { id: '3' }
    } as unknown as Proposal;
    ['10', '1', '2', '3'].forEach(id => expect(service.canUserAccessProposal(propuesta, id)).toBe(true));
    expect(service.canUserAccessProposal(propuesta, '99')).toBe(false);
  });

  it('getById consulta el backend si el trabajo no está en memoria', () => {
    let resultado: Proposal | undefined;
    service.getById('15').subscribe(propuesta => resultado = propuesta);
    http.expectOne(`${API}/15`).flush(crearTrabajoDePrueba());

    expect(resultado?.title).toBe('Sistema de gestión');
  });
});
