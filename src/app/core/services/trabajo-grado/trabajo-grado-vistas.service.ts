import { computed, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { TrabajoGradoStoreService } from './trabajo-grado-store.service';
import { TrabajoGradoApiService } from './trabajo-grado-api.service';
import { UserStorageService } from '../../../modules/users/services/user-storage.service';
import { aAnteproyecto, aPropuesta, aTrabajoDeGrado, ContextoMapeo } from '../../mappers/trabajo-grado.mapper';
import { Proposal } from '../../../modules/proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../../modules/preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../../modules/thesis-work/interfaces/thesis-work.interface';

/**
 * Vistas del front construidas desde los trabajos del backend: propuestas,
 * anteproyectos y trabajos de grado, todas con el id del trabajo. Se
 * recalculan solas cuando cambia el almacén o la lista de usuarios.
 */
@Injectable({ providedIn: 'root' })
export class TrabajoGradoVistasService {
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly userStorage = inject(UserStorageService);

  /** Datos para el mapeo: usuarios conocidos y URL de descarga de archivos. */
  readonly contexto = computed<ContextoMapeo>(() => ({
    usuarios: new Map(this.userStorage.users().map(usuario => [usuario.id, usuario])),
    urlArchivo: (id, ruta) => this.api.urlArchivo(id, ruta)
  }));

  readonly propuestas = computed<Proposal[]>(() =>
    this.store.trabajos().map(trabajo => aPropuesta(trabajo, this.contexto())));

  readonly anteproyectos = computed<PreliminaryDraft[]>(() =>
    this.store.trabajos()
      .map(trabajo => aAnteproyecto(trabajo, this.contexto()))
      .filter((anteproyecto): anteproyecto is PreliminaryDraft => anteproyecto !== null));

  readonly trabajosDeGrado = computed<ThesisWork[]>(() =>
    this.store.trabajos()
      .map(trabajo => aTrabajoDeGrado(trabajo, this.contexto()))
      .filter((trabajo): trabajo is ThesisWork => trabajo !== null));

  /** true cuando terminó la primera carga desde el backend. */
  readonly cargado = this.store.cargado;

  /** Propuesta por id (de memoria o del backend). */
  propuesta(id: string): Observable<Proposal | undefined> {
    return this.store.obtener(id).pipe(map(trabajo => trabajo ? aPropuesta(trabajo, this.contexto()) : undefined));
  }

  /** Anteproyecto por id; undefined si no existe o la propuesta aún no está aprobada. */
  anteproyecto(id: string): Observable<PreliminaryDraft | undefined> {
    return this.store.obtener(id).pipe(
      map(trabajo => (trabajo ? aAnteproyecto(trabajo, this.contexto()) : null) ?? undefined));
  }

  /** Trabajo de grado por id; undefined si no existe o aún no está en curso. */
  trabajoDeGrado(id: string): Observable<ThesisWork | undefined> {
    return this.store.obtener(id).pipe(
      map(trabajo => (trabajo ? aTrabajoDeGrado(trabajo, this.contexto()) : null) ?? undefined));
  }
}
