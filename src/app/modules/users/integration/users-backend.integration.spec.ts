import { ContractType } from '../enum/contract-type.enum';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { UsersFacadeService } from '../pages/users-page/services/users-facade.service';
import { UserFormFacadeService } from '../pages/services/user-form-facade.service';
import { UserService } from '../services/user.service';
import { UserStorageService } from '../services/user-storage.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { UsuarioResponse } from '../../../core/interfaces/api/auth-api.interface';
import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserState } from '../enum/user-state.enum';
import { IdentificationType } from '../enum/identification-type.enum';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

const API = '/api/v1/sgtg/usuarios';

const usuarioApi = (id: number, overrides: Partial<UsuarioResponse> = {}): UsuarioResponse => ({
  id,
  codigo: `10${id}`,
  tipoDocumento: 'CC',
  numeroDocumento: `106${id}`,
  email: `u${id}@unicauca.edu.co`,
  primerNombre: `Usuario${id}`,
  segundoNombre: null,
  primerApellido: 'Prueba',
  segundoApellido: null,
  roles: ['DOCENTE'],
  activo: true,
  tipoVinculacion: null,
  departamento: null,
  programa: null,
  ...overrides
});

/**
 * Integración del módulo de usuarios con el backend simulado por
 * HttpTestingController: fachadas, servicio, almacenamiento en memoria y
 * sesión.
 */
describe('Integración [Users]: administración de usuarios contra el backend', () => {
  let http: HttpTestingController;
  let storage: UserStorageService;
  let auth: AuthStorageService;
  let usersFacade: UsersFacadeService;
  let formFacade: UserFormFacadeService;
  let userService: UserService;
  let notification: { show: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    notification = { show: jest.fn() };
    router = { navigate: jest.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notification },
        { provide: Router, useValue: router }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(UserStorageService);
    auth = TestBed.inject(AuthStorageService);
    usersFacade = TestBed.inject(UsersFacadeService);
    formFacade = TestBed.inject(UserFormFacadeService);
    userService = TestBed.inject(UserService);
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  /** Inicia sesión como el usuario 1 (administrador): el servicio carga la lista del backend. */
  const iniciarSesionConLista = (lista: UsuarioResponse[]) => {
    TestBed.tick();
    auth.setSession(crearJwtDePrueba(), {
      id: '1', idType: IdentificationType.CC, idNumber: 1, firstName: 'Admin', lastName: 'SGTG', secondLastName: '',
      codeNumber: 0, roles: [UserRoleType.ADMINISTRADOR], email: 'admin@unicauca.edu.co', state: UserState.active
    });
    TestBed.tick();
    http.expectOne(API).flush(lista);
  };

  /** La página de usuarios carga los que gestiona el usuario de la sesión, con si los puede modificar. */
  const cargarGestion = (lista: UsuarioResponse[], modificable = true) => {
    usersFacade.loadUsers();
    http.expectOne(`${API}/gestion`).flush(lista.map(usuario => ({ usuario, modificable })));
  };

  it('al iniciar sesión carga la lista y al cerrarla la vacía', () => {
    iniciarSesionConLista([usuarioApi(1, { roles: ['ADMINISTRADOR'] }), usuarioApi(2)]);
    expect(userService.users().map(user => user.id)).toEqual(['1', '2']);

    auth.clearUser();
    TestBed.tick();
    expect(userService.users()).toEqual([]);
  });

  it('el registro envía el perfil, agrega el usuario a la tabla y vuelve a la lista', () => {
    iniciarSesionConLista([]);
    const nuevo: User = {
      id: '', idType: IdentificationType.CC, idNumber: 1069, firstName: 'Ana', secondName: '', lastName: 'Pérez',
      secondLastName: 'Gómez', codeNumber: 109, roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR],
      email: 'ana@unicauca.edu.co', password: 'Clave1234', state: UserState.active,
      department: { id: 1, name: 'Sistemas' }, contractType: ContractType.OCASIONAL
    };
    let exito = false;
    formFacade.createUser(nuevo, () => exito = true);

    const req = http.expectOne(API);
    expect(req.request.body).toEqual(expect.objectContaining({ tipoVinculacion: 'OCASIONAL', departamentoId: 1 }));
    req.flush(usuarioApi(9, { primerNombre: 'Ana', roles: ['DOCENTE', 'DIRECTOR'], tipoVinculacion: 'OCASIONAL',
      departamento: { id: 1, nombre: 'Sistemas' } }));

    expect(exito).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/users']);
    // La lista de usuarios ya lo tiene; la tabla lo trae al volver a la página (recarga la gestión)
    expect(storage.getUsersSnapshot().map(user => user.id)).toContain('9');
  });

  it('si el backend rechaza el registro, muestra su mensaje y no navega', () => {
    iniciarSesionConLista([]);
    formFacade.createUser({ roles: [UserRoleType.DOCENTE] } as User, () => undefined);

    http.expectOne(API).flush(
      { errorCode: 'GC-0002', message: 'ERROR, ENTITY ALREADY EXISTS, Ya existe un usuario registrado con el correo o código indicado.' },
      { status: 406, statusText: 'Not Acceptable' });

    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Ya existe un usuario registrado con el correo o código indicado.'
    }));
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('la tabla recalcula estado y acciones al deshabilitar un usuario', () => {
    iniciarSesionConLista([usuarioApi(2)]);
    cargarGestion([usuarioApi(2)]);
    expect(usersFacade.usersTableData()[0].allowedActions).toContain('eliminar');

    let exito = false;
    usersFacade.toggleUserStatus('2', false, () => exito = true);
    const req = http.expectOne(`${API}/2/estado`);
    expect(req.request.body).toEqual({ activo: false });
    req.flush(usuarioApi(2, { activo: false }));
    http.expectOne(`${API}/gestion`).flush([{ usuario: usuarioApi(2, { activo: false }), modificable: true }]);

    expect(exito).toBe(true);
    const fila = usersFacade.usersTableData()[0];
    expect(fila.estado).toBe('Inactivo');
    expect(fila.allowedActions).toContain('activar');
    expect(fila.allowedActions).not.toContain('eliminar');
  });

  it('el cambio de roles reemplaza el arreglo completo', () => {
    iniciarSesionConLista([usuarioApi(2, { roles: ['DOCENTE', 'EVALUADOR'] })]);
    cargarGestion([usuarioApi(2, { roles: ['DOCENTE', 'EVALUADOR'] })]);

    usersFacade.updateRoles('2', [UserRoleType.JURADO], () => undefined);
    const req = http.expectOne(`${API}/2/roles`);
    expect(req.request.body).toEqual({ roles: ['JURADO'] });
    req.flush(usuarioApi(2, { roles: ['JURADO'] }));
    http.expectOne(`${API}/gestion`).flush([{ usuario: usuarioApi(2, { roles: ['JURADO'] }), modificable: true }]);

    expect(storage.getUsersSnapshot()[0].roles).toEqual([UserRoleType.JURADO]);
    expect(usersFacade.usersTableData()[0].originalData.roles).toEqual([UserRoleType.JURADO]);
  });

  it('a los usuarios con roles administrativos el gestor solo los consulta', () => {
    iniciarSesionConLista([]);
    cargarGestion([usuarioApi(50, { roles: ['COMITE', 'DOCENTE'] })], false);

    expect(usersFacade.usersTableData()[0].allowedActions).toEqual(['ver roles asignados', 'ver']);
  });

  it('al editar su propio perfil se actualiza también la sesión; al editar a otro, no', () => {
    iniciarSesionConLista([usuarioApi(1, { roles: ['ADMINISTRADOR'] }), usuarioApi(2)]);

    formFacade.updateUser('1', { firstName: 'Administradora' } as User, () => undefined, () => undefined);
    http.expectOne(`${API}/1`).flush(usuarioApi(1, { primerNombre: 'Administradora', roles: ['ADMINISTRADOR'] }));
    expect(auth.currentUser()?.firstName).toBe('Administradora');

    formFacade.updateUser('2', { firstName: 'Otro' } as User, () => undefined, () => undefined);
    http.expectOne(`${API}/2`).flush(usuarioApi(2, { primerNombre: 'Otro' }));
    expect(auth.currentUser()?.firstName).toBe('Administradora');
    expect(storage.getUsersSnapshot().find(user => user.id === '2')?.firstName).toBe('Otro');
  });

});
