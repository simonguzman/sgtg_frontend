import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrabajoGradoStoreService, VIGENCIA_TRABAJOS_MS } from './trabajo-grado-store.service';
import { AuthStorageService } from '../auth/auth-storage.service';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';
import { crearTrabajoDePrueba, crearTrabajoEnCurso } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (roles: UserRoleType[]): User => ({
  id: '1', idType: 'CC', idNumber: 1, firstName: 'U', lastName: 'P', secondLastName: '', codeNumber: 1,
  roles, email: 'u@unicauca.edu.co', state: UserState.active
});

describe('TrabajoGradoStoreService', () => {
  let store: TrabajoGradoStoreService;
  let auth: AuthStorageService;
  let http: HttpTestingController;
  /** Reloj de la prueba (ms): la vigencia de la memoria se mide con Date.now() */
  let ahora: number;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    ahora = Date.UTC(2026, 9, 18, 15);
    jest.spyOn(Date, 'now').mockImplementation(() => ahora);
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(TrabajoGradoStoreService);
    auth = TestBed.inject(AuthStorageService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  const iniciarSesion = (roles: UserRoleType[]) => {
    auth.setSession(crearJwtDePrueba(), usuario(roles));
    TestBed.tick();
  };

  it('sin sesión no consulta nada', () => {
    expect(store.trabajos()).toEqual([]);
    expect(store.cargado()).toBe(false);
  });

  it('un participante carga solo sus trabajos', () => {
    iniciarSesion([UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    expect(store.trabajos().map(t => t.id)).toEqual([15]);
    expect(store.cargado()).toBe(true);
  });

  it.each([UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO, UserRoleType.ADMINISTRADOR])(
    'el rol %s carga todos los trabajos', rol => {
      iniciarSesion([rol]);
      http.expectOne(API).flush([crearTrabajoDePrueba(), crearTrabajoDePrueba({ id: 16 })]);
      expect(store.trabajos()).toHaveLength(2);
    });

  it('al cerrar sesión vacía la lista', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    auth.clearUser();
    TestBed.tick();
    expect(store.trabajos()).toEqual([]);
    expect(store.cargado()).toBe(false);
  });

  it('si la carga falla conserva la lista y marca la carga como terminada', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush(null, { status: 500, statusText: 'Error' });
    expect(store.trabajos()).toEqual([]);
    expect(store.cargado()).toBe(true);
  });

  it('upsert reemplaza el trabajo actualizado o agrega uno nuevo al inicio', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    store.upsert(crearTrabajoEnCurso());
    expect(store.trabajos()).toHaveLength(1);
    expect(store.porId().get('15')?.etapa).toBe('EN_CURSO');

    store.upsert(crearTrabajoDePrueba({ id: 16 }));
    expect(store.trabajos().map(t => t.id)).toEqual([16, 15]);
  });

  it('obtener usa la memoria y, si no está, lo consulta al backend', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    let encontrado: number | undefined;
    store.obtener('15').subscribe(t => encontrado = t?.id);
    expect(encontrado).toBe(15);

    store.obtener('16').subscribe(t => encontrado = t?.id);
    http.expectOne(`${API}/16`).flush(crearTrabajoDePrueba({ id: 16 }));
    expect(encontrado).toBe(16);
    expect(store.porId().has('16')).toBe(true);

    let noExiste: unknown = 'sin respuesta';
    store.obtener('404').subscribe(t => noExiste = t);
    http.expectOne(`${API}/404`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(noExiste).toBeUndefined();
  });

  describe('vigencia de la memoria', () => {
    beforeEach(() => {
      iniciarSesion([UserRoleType.ESTUDIANTE]);
      http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);
    });

    it('obtener vuelve a consultar el trabajo cuando su copia está vencida', () => {
      ahora += VIGENCIA_TRABAJOS_MS - 1;
      let etapa: string | undefined;
      store.obtener('15').subscribe(t => etapa = t?.etapa);
      expect(etapa).toBe('PROPUESTA');

      ahora += 2;
      store.obtener('15').subscribe(t => etapa = t?.etapa);
      http.expectOne(`${API}/15`).flush(crearTrabajoEnCurso());
      expect(etapa).toBe('EN_CURSO');
      expect(store.porId().get('15')?.etapa).toBe('EN_CURSO');

      // La copia recién recibida vuelve a ser vigente
      store.obtener('15').subscribe();
    });

    it('sin conexión usa la copia en memoria', () => {
      ahora += VIGENCIA_TRABAJOS_MS + 1;
      let id: number | undefined;
      store.obtener('15').subscribe(t => id = t?.id);
      http.expectOne(`${API}/15`).error(new ProgressEvent('error'));
      expect(id).toBe(15);
    });

    it('refrescarSiVencida recarga la lista solo si superó la vigencia', () => {
      store.refrescarSiVencida();
      http.expectNone(`${API}/mis-trabajos`);

      ahora += VIGENCIA_TRABAJOS_MS + 1;
      store.refrescarSiVencida();
      http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoEnCurso()]);
      expect(store.porId().get('15')?.etapa).toBe('EN_CURSO');
    });

    it('las cargas simultáneas comparten una sola petición', () => {
      const recibidas: number[] = [];
      store.cargar().subscribe(lista => recibidas.push(lista.length));
      store.cargar().subscribe(lista => recibidas.push(lista.length));
      http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba(), crearTrabajoDePrueba({ id: 16 })]);
      expect(recibidas).toEqual([2, 2]);
    });
  });
});
