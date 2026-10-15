import { inject, Injectable } from '@angular/core';
import { map, Observable, tap, throwError } from 'rxjs';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { TrabajoGradoAnulacionService } from '../../../core/services/trabajo-grado/trabajo-grado-anulacion.service';
import { aAnteproyecto } from '../../../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

/**
 * Operaciones del anteproyecto contra el backend. El anteproyecto es una vista
 * del trabajo de grado (mismo id): registrarlo es radicar su primera versión y
 * corregirlo es radicar una nueva.
 */
@Injectable({ providedIn: 'root' })
export class PreliminaryDraftApiService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly anulacion = inject(TrabajoGradoAnulacionService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  public getPreliminaryDraftById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.storage.getById(id);
  }

  /** Registra el anteproyecto: radica su primera versión sobre el trabajo de la propuesta aprobada. */
  public createPreliminaryDraft(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.radicar(preliminaryDraft.proposalId, preliminaryDraft.attachment).pipe(
      tap(anteproyecto => this.notificar(anteproyecto, AppEventType.PRELIMINARY_DRAFT_CREATED, true))
    );
  }

  /**
   * Corrige el anteproyecto radicando una nueva versión del documento. El
   * backend solo lo permite tras correcciones de los evaluadores o un NO
   * APROBADO del Consejo; el título y la descripción no se editan aquí.
   */
  public updatePreliminaryDraft(id: string, updatedData: PreliminaryDraft): Observable<PreliminaryDraft> {
    if (!updatedData.attachment) {
      return throwError(() => new Error('Adjunte la nueva versión del anteproyecto.'));
    }
    return this.radicar(id, updatedData.attachment).pipe(
      tap(anteproyecto => this.notificar(anteproyecto, AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED, false))
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

  private notificar(anteproyecto: PreliminaryDraft, tipo: AppEventType, incluirJefes: boolean): void {
    const ids = new Set<string>();
    const proposal = anteproyecto.proposalData;
    proposal?.authors?.forEach(author => { if (author?.id) ids.add(author.id); });
    [proposal?.director, proposal?.codirector, proposal?.advisor].forEach(user => { if (user?.id) ids.add(user.id); });
    anteproyecto.evaluators?.forEach(evaluator => ids.add(evaluator.id));
    if (incluirJefes) {
      this.userService.users()
        .filter(user => user.roles.includes(UserRoleType.JEFE_DEP))
        .forEach(user => ids.add(user.id));
    }
    this.eventBus.emit({
      type: tipo,
      targetUserIds: Array.from(ids),
      payload: {
        preliminaryDraftId: anteproyecto.preliminaryDraftId,
        preliminaryDraftTitle: proposal?.title || ''
      }
    });
  }
}
