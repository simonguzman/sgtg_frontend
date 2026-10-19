import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserApiService } from './user-api.service';
import { UserStorageService } from './user-storage.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { UsuarioResponse } from '../../../core/interfaces/api/auth-api.interface';
import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserState } from '../enum/user-state.enum';
import { IdentificationType } from '../enum/identification-type.enum';
import { ContractType } from '../enum/contract-type.enum';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

const API = '/api/v1/sgtg/usuarios';

const usuarioApi = (overrides: Partial<UsuarioResponse> = {}): UsuarioResponse => ({
  id: 5,
  codigo: '1005',
  tipoDocumento: 'CC',
  numeroDocumento: '1065',
  email: 'd5@unicauca.edu.co',
  primerNombre: 'Docente',
  segundoNombre: null,
  primerApellido: 'Cinco',
  segundoApellido: null,
  roles: ['DOCENTE', 'DIRECTOR'],
  activo: true,
  tipoVinculacion: 'OCASIONAL',
  departamento: { id: 1, nombre: 'Sistemas' },
  programa: null,
  ...overrides
});

const formUser = (overrides: Partial<User> = {}): User => ({
  id: '',
  idType: IdentificationType.CC,
  idNumber: 1065,
  firstName: 'Docente',
  secondName: '',
  lastName: 'Cinco',
  secondLastName: '',
  codeNumber: 1005,
  roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR],
  email: 'd5@unicauca.edu.co',
  password: 'Clave1234',
  state: UserState.active,
  department: { id: 1, name: 'Sistemas' },
  contractType: ContractType.OCASIONAL,
  program: null,
  ...overrides
});

describe('UserApiService', () => {
  let service: UserApiService;
  let storage: UserStorageService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserApiService);
    storage = TestBed.inject(UserStorageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Deja en la lista el usuario 5 tal como lo devuelve el backend. */
  const cargarLista = () => {
    service.loadUsers().subscribe();
    http.expectOne(API).flush([usuarioApi()]);
  };

  describe('consultas', () => {
    it('loadUsers carga la lista con los usuarios convertidos', () => {
      let users: User[] = [];
      service.loadUsers().subscribe(lista => users = lista);
      http.expectOne(API).flush([usuarioApi(), usuarioApi({ id: 6, roles: ['ESTUDIANTE'], tipoVinculacion: null,
        departamento: null, programa: { id: 7, nombre: 'Ingeniería de Sistemas' } })]);

      expect(users.map(user => user.id)).toEqual(['5', '6']);
      expect(storage.getUsersSnapshot()).toEqual(users);
      expect(users[0].contractType).toBe(ContractType.OCASIONAL);
      expect(users[1].program).toEqual({ id: 7, name: 'Ingeniería de Sistemas' });
    });

    it('getUserById consulta el usuario y lo refleja en la lista', () => {
      let user: User | undefined;
      service.getUserById('5').subscribe(u => user = u);
      http.expectOne(`${API}/5`).flush(usuarioApi());

      expect(user?.email).toBe('d5@unicauca.edu.co');
      expect(storage.getUsersSnapshot().map(u => u.id)).toEqual(['5']);
    });

    it('getUserById devuelve undefined si no existe', () => {
      let user: User | undefined = formUser();
      service.getUserById('404').subscribe(u => user = u);
      http.expectOne(`${API}/404`).flush({ message: 'No se encontró' }, { status: 404, statusText: 'Not Found' });
      expect(user).toBeUndefined();
    });

    it('getUsersByRole filtra la lista cargada', () => {
      cargarLista();
      let docentes: User[] = [];
      service.getUsersByRole(UserRoleType.DIRECTOR).subscribe(lista => docentes = lista);
      expect(docentes.map(u => u.id)).toEqual(['5']);
    });
  });

  describe('crear y editar', () => {
    it('createUser envía el usuario con la vinculación elegida y lo agrega a la lista', () => {
      let saved: User | undefined;
      service.createUser(formUser()).subscribe(u => saved = u);

      const req = http.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(expect.objectContaining({
        codigo: '1005',
        tipoDocumento: 'CC',
        roles: ['DOCENTE', 'DIRECTOR'],
        tipoVinculacion: 'OCASIONAL',
        departamentoId: 1,
        programaId: null,
        password: 'Clave1234'
      }));
      req.flush(usuarioApi());

      expect(saved?.id).toBe('5');
      expect(storage.getUsersSnapshot().map(u => u.id)).toEqual(['5']);
    });

    it('la vinculación no se deduce de los roles: un codirector lleva la que se eligió', () => {
      service.createUser(formUser({ roles: [UserRoleType.CODIRECTOR], contractType: ContractType.CATEDRA })).subscribe();
      const req = http.expectOne(API);
      expect(req.request.body.tipoVinculacion).toBe('CATEDRA');
      req.flush(usuarioApi());
    });

    it('updateUser envía el usuario completo y reemplaza el de la lista', () => {
      cargarLista();
      service.updateUser('5', { firstName: 'Editado', password: '' }).subscribe();

      const req = http.expectOne(`${API}/5`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(expect.objectContaining({
        primerNombre: 'Editado', primerApellido: 'Cinco', password: '', departamentoId: 1
      }));
      req.flush(usuarioApi({ primerNombre: 'Editado' }));

      expect(storage.getUsersSnapshot()[0].firstName).toBe('Editado');
    });

    it('si el usuario editado es el de la sesión, también actualiza la sesión', () => {
      const auth = TestBed.inject(AuthStorageService);
      cargarLista();
      auth.setSession(crearJwtDePrueba(), storage.getUsersSnapshot()[0]);

      service.updateUser('5', { firstName: 'Yo mismo' }).subscribe();
      http.expectOne(`${API}/5`).flush(usuarioApi({ primerNombre: 'Yo mismo' }));

      expect(auth.currentUser()?.firstName).toBe('Yo mismo');
    });
  });

  describe('roles y estado', () => {
    it('updateUserRoles envía las claves de los roles', () => {
      cargarLista();
      service.updateUserRoles('5', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]).subscribe();

      const req = http.expectOne(`${API}/5/roles`);
      expect(req.request.body).toEqual({ roles: ['DOCENTE', 'JEFE_DEP'] });
      req.flush(usuarioApi({ roles: ['DOCENTE', 'JEFE_DEP'] }));

      expect(storage.getUsersSnapshot()[0].roles).toEqual([UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]);
    });

    it('softDeleteUser inactiva al usuario activo y activa al inactivo', () => {
      cargarLista();
      service.softDeleteUser('5').subscribe();
      const inactivar = http.expectOne(`${API}/5/estado`);
      expect(inactivar.request.body).toEqual({ activo: false });
      inactivar.flush(usuarioApi({ activo: false }));
      expect(storage.getUsersSnapshot()[0].state).toBe(UserState.inactive);

      service.softDeleteUser('5').subscribe();
      const activar = http.expectOne(`${API}/5/estado`);
      expect(activar.request.body).toEqual({ activo: true });
      activar.flush(usuarioApi());
      expect(storage.getUsersSnapshot()[0].state).toBe(UserState.active);
    });
  });

});
