import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aTrabajoDeGrado } from '../../../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';
import { ThesisWork } from '../interfaces/thesis-work.interface';

/**
 * Informes mensuales (formato D) contra el backend. Los radica un estudiante
 * del trabajo (en práctica profesional también el director) y los revisan el
 * director, el codirector o el asesor con observaciones y/o un PDF de notas.
 * La revisión es una formalidad: no cambia la etapa del trabajo.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkAdvanceService {
  private readonly eventBus = inject(EventBusService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /**
   * Radica un informe mensual.
   *
   * @param informe       PDF del informe (formato D)
   * @param observaciones comentario opcional de quien lo radica
   */
  radicarInforme(thesisWorkId: string, informe: File, observaciones: string): Observable<ThesisWork> {
    const datos = observaciones.trim() ? { observaciones: observaciones.trim() } : null;
    return this.api.enviarArchivos(thesisWorkId, 'informes-mensuales', datos, { archivo: informe }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo)),
      tap(thesisWork => this.eventBus.emit({
        type: AppEventType.THESIS_ADVANCE_UPLOADED,
        targetUserIds: [...new Set(collectParticipantIds(thesisWork.preliminaryDraftData?.proposalData))],
        payload: {
          thesisId: thesisWorkId,
          thesisWorkId,
          title: thesisWork.advances?.[0]?.title ?? 'Informe mensual',
          thesisTitle: thesisWork.preliminaryDraftData?.proposalData?.title ?? ''
        }
      }))
    );
  }

  /**
   * Revisión de un informe por el director, el codirector o el asesor (una
   * por revisor). Debe incluir observaciones o el PDF de notas.
   *
   * @param numero número del informe (id del avance)
   * @param notas  PDF opcional con las notas del revisor
   */
  revisarInforme(thesisWorkId: string, numero: string, observaciones: string,
    notas: File | null): Observable<ThesisWork> {
    const datos = observaciones.trim() ? { observaciones: observaciones.trim() } : null;
    return this.api.enviarArchivos(thesisWorkId, `informes-mensuales/${numero}/revisiones`, datos,
      { archivo: notas }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo)),
      tap(thesisWork => this.eventBus.emit({
        type: AppEventType.THESIS_ADVANCE_EVALUATED,
        targetUserIds: [...new Set(collectParticipantIds(thesisWork.preliminaryDraftData?.proposalData))],
        payload: {
          thesisId: thesisWorkId,
          thesisWorkId,
          veredict: 'Revisado',
          thesisTitle: thesisWork.preliminaryDraftData?.proposalData?.title ?? ''
        }
      }))
    );
  }

  private vista(trabajo: TrabajoGradoResponse): ThesisWork {
    const thesisWork = aTrabajoDeGrado(trabajo, this.vistas.contexto());
    if (!thesisWork) throw new Error('El trabajo de grado no está en curso.');
    return thesisWork;
  }
}
