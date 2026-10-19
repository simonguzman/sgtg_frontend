import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TrabajoGradoApiService } from './trabajo-grado-api.service';
import { AuthStorageService } from '../auth/auth-storage.service';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { TrabajoGradoResponse } from '../../interfaces/api/trabajo-grado-api.interface';

/** Roles que consultan todos los trabajos (los demás solo ven en los que participan). */
export const ROLES_CONSULTA_GENERAL: readonly UserRoleType[] = [
  UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO,
  UserRoleType.DECANATURA
];

/**
 * Tiempo durante el cual un trabajo en memoria se considera vigente. Pasado
 * este tiempo, la lista se recarga al navegar o al volver a la pestaña, y el
 * detalle de un trabajo se consulta de nuevo al abrirlo.
 */
export const VIGENCIA_TRABAJOS_MS = 20_000;

/**
 * Trabajos de grado del backend en memoria. Es la fuente de las vistas de
 * propuesta, anteproyecto y trabajo de grado: cada vista se construye desde
 * el mismo trabajo con `core/mappers/trabajo-grado.mapper.ts`.
 *
 * Se carga al iniciar sesión (o al abrir la aplicación con sesión) y se vacía
 * al cerrarla. Cada operación del backend devuelve el trabajo actualizado,
 * que se reemplaza con {@link upsert}.
 *
 * Para ver lo que cambian otros usuarios sin consultar el backend todo el
 * tiempo, la memoria tiene una vigencia ({@link VIGENCIA_TRABAJOS_MS}):
 * - Las listas se muestran de inmediato con lo que hay en memoria y, si está
 *   vencida, se recargan en segundo plano al navegar o al volver a la pestaña
 *   (`iniciarRefrescoDeTrabajos`); las vistas son señales: se actualizan solas
 *   al llegar los datos.
 * - El detalle de un trabajo ({@link obtener}) se consulta al backend solo si
 *   su copia está vencida; si es reciente se usa la memoria.
 * - Las cargas simultáneas comparten una sola petición.
 * Además, el buzón recarga la lista cuando llegan notificaciones nuevas.
 */
@Injectable({ providedIn: 'root' })
export class TrabajoGradoStoreService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly authStorage = inject(AuthStorageService);

  private readonly _trabajos = signal<TrabajoGradoResponse[]>([]);
  private readonly _cargado = signal(false);

  /** Momento (ms) en que se consultó la lista por última vez. */
  private ultimaCargaLista = 0;
  /** Momento (ms) en que se recibió cada trabajo desde el backend, por id. */
  private readonly recibidoEn = new Map<string, number>();
  /** Carga de la lista en curso, compartida por quienes la pidan mientras tanto. */
  private cargaEnCurso?: Observable<TrabajoGradoResponse[]>;

  /** Trabajos visibles para el usuario, del más reciente al más antiguo. */
  readonly trabajos = this._trabajos.asReadonly();
  /** true cuando terminó la primera carga desde el backend. */
  readonly cargado = this._cargado.asReadonly();
  readonly porId = computed(() => new Map(this._trabajos().map(trabajo => [String(trabajo.id), trabajo])));

  constructor() {
    let autenticadoAntes = false;
    effect(() => {
      const autenticado = this.authStorage.isAuthenticated();
      untracked(() => {
        if (autenticado && !autenticadoAntes) this.cargar().subscribe();
        if (!autenticado && autenticadoAntes) this.limpiar();
      });
      autenticadoAntes = autenticado;
    });
  }

  /** @returns true si el usuario en sesión consulta todos los trabajos */
  tieneConsultaGeneral(): boolean {
    const roles = this.authStorage.userRoles();
    return ROLES_CONSULTA_GENERAL.some(rol => roles.includes(rol));
  }

  /**
   * Carga (o recarga) la lista: todos los trabajos para los roles de consulta
   * general, los propios para los demás. Un error deja la lista como estaba.
   * Si ya hay una carga en curso, devuelve esa misma.
   */
  cargar(): Observable<TrabajoGradoResponse[]> {
    if (this.cargaEnCurso) return this.cargaEnCurso;
    this.ultimaCargaLista = Date.now();
    const consulta = this.tieneConsultaGeneral() ? this.api.todos() : this.api.misTrabajos();
    this.cargaEnCurso = consulta.pipe(
      tap(trabajos => {
        const ahora = Date.now();
        this.recibidoEn.clear();
        trabajos.forEach(trabajo => this.recibidoEn.set(String(trabajo.id), ahora));
        this._trabajos.set(trabajos);
        this._cargado.set(true);
      }),
      catchError(error => {
        console.warn('No se pudieron cargar los trabajos de grado', error?.status);
        this._cargado.set(true);
        return of(this._trabajos());
      }),
      finalize(() => this.cargaEnCurso = undefined),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.cargaEnCurso;
  }

  /**
   * Recarga la lista en segundo plano si la última consulta superó la
   * vigencia. Se llama al navegar y al volver a la pestaña.
   */
  refrescarSiVencida(): void {
    if (!this.authStorage.isAuthenticated() || !this._cargado()) return;
    if (Date.now() - this.ultimaCargaLista < VIGENCIA_TRABAJOS_MS) return;
    this.cargar().subscribe();
  }

  /**
   * Busca un trabajo: si la copia en memoria es reciente la devuelve; si no
   * está o está vencida, lo consulta al backend. Sin conexión se usa la copia
   * en memoria; si el backend dice que no existe o no es visible, undefined.
   */
  obtener(id: string | number): Observable<TrabajoGradoResponse | undefined> {
    const clave = String(id);
    const enMemoria = this.porId().get(clave);
    if (enMemoria && this.vigente(clave)) return of(enMemoria);
    return this.api.consultar(id).pipe(
      tap(trabajo => this.upsert(trabajo)),
      map(trabajo => trabajo as TrabajoGradoResponse | undefined),
      catchError((error: HttpErrorResponse) => of(error?.status === 403 || error?.status === 404 ? undefined : enMemoria))
    );
  }

  /** Agrega o reemplaza un trabajo (respuesta de una operación del backend). */
  upsert(trabajo: TrabajoGradoResponse): void {
    this.recibidoEn.set(String(trabajo.id), Date.now());
    this._trabajos.update(lista => lista.some(t => t.id === trabajo.id)
      ? lista.map(t => t.id === trabajo.id ? trabajo : t)
      : [trabajo, ...lista]);
  }

  private vigente(clave: string): boolean {
    return Date.now() - (this.recibidoEn.get(clave) ?? 0) < VIGENCIA_TRABAJOS_MS;
  }

  private limpiar(): void {
    this._trabajos.set([]);
    this._cargado.set(false);
    this.recibidoEn.clear();
    this.ultimaCargaLista = 0;
  }
}
