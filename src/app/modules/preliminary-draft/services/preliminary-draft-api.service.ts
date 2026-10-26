import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { TrabajoGradoAnulacionService } from '../../../core/services/trabajo-grado/trabajo-grado-anulacion.service';
import { aAnteproyecto } from '../../../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { datosDescriptivos } from '../../proposal/services/proposal-api.service';

/**
 * Operaciones del anteproyecto contra el backend. El anteproyecto es una vista
 * del trabajo de grado (mismo id): registrarlo es radicar su primera versión y
 * corregirlo es guardar los datos del trabajo y radicar una nueva.
 */
@Injectable({ providedIn: 'root' })
export class PreliminaryDraftApiService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly anulacion = inject(TrabajoGradoAnulacionService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  public getPreliminaryDraftById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.storage.getById(id);
  }

  /** Registra el anteproyecto: radica su primera versión sobre el trabajo de la propuesta aprobada. */
  public createPreliminaryDraft(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.radicar(preliminaryDraft.proposalId, preliminaryDraft.attachment);
  }

  /**
   * Corrige el anteproyecto como la propuesta: guarda el título, los objetivos,
   * la descripción y la línea de investigación (`PUT /{id}/anteproyecto`) y, si
   * se cargó un nuevo documento, lo radica como nueva versión. El backend solo
   * lo permite tras correcciones de los evaluadores o un NO APROBADO del Consejo.
   */
  public updatePreliminaryDraft(id: string, updatedData: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.api.actualizar(id, 'anteproyecto', datosDescriptivos(updatedData.proposalData)).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      switchMap(trabajo => updatedData.attachment
        ? this.radicar(id, updatedData.attachment)
        : of(this.vista(trabajo)))
    );
  }

  /** Anulación del director (borrado lógico): el trabajo queda cancelado y pasa al historial. */
  public annulDraft(id: string, justification: string): Observable<void> {
    return this.anulacion.anular(id, justification).pipe(map(() => undefined));
  }

  /** Radica una versión del anteproyecto (`POST /{id}/anteproyecto`, multipart). */
  radicar(trabajoId: string, archivo: File | null | undefined): Observable<PreliminaryDraft> {
    if (!archivo) return throwError(() => new Error('Debe adjuntar el documento del anteproyecto.'));
    return this.api.enviarArchivos(trabajoId, 'anteproyecto', null, { archivo }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  private vista(trabajo: TrabajoGradoResponse): PreliminaryDraft {
    const anteproyecto = aAnteproyecto(trabajo, this.vistas.contexto());
    if (!anteproyecto) throw new Error('El trabajo de grado no tiene anteproyecto radicado.');
    return anteproyecto;
  }
}
