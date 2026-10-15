import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aTrabajoDeGrado } from '../../../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { UserService } from '../../users/services/user.service';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SpecialRequest } from '../interfaces/special-request.interface';
import { SpecialRequestType } from '../enums/special-request-type.enum';

/** Datos de una solicitud del director, según su tipo. */
export type SpecialRequestSubmission =
  | { requestType: SpecialRequestType.CAMBIO_TITULO; title: string; objectives: string[]; justification: string }
  | { requestType: SpecialRequestType.PRORROGA; months: number; document: File }
  | { requestType: SpecialRequestType.SUSPENSION; document: File }
  | { requestType: SpecialRequestType.REANUDACION; document: File }
  | { requestType: SpecialRequestType.CANCELACION; document: File }
  | { requestType: SpecialRequestType.NUEVA_SUSTENTACION; document: File };

/** Decisión del Consejo de Facultad sobre una solicitud, con la resolución (obligatoria). */
export interface SpecialRequestDecision {
  status: stateList.APROBADO | stateList.NO_APROBADO;
  resolutionDetails: string;
  resolution: File;
  /** Nueva fecha de sustentación: fecha y hora aprobadas (ej. `2026-07-21T09:00:00`) */
  newDateTime?: string;
  /** Nueva fecha de sustentación: salón, si cambia */
  newLocation?: string;
}

/** Ruta en el backend de cada solicitud que decide el Consejo (la reanudación no se decide). */
const OPERACIONES: Partial<Record<SpecialRequestType, string>> = {
  [SpecialRequestType.CAMBIO_TITULO]: 'cambio-objetivos',
  [SpecialRequestType.PRORROGA]: 'prorroga',
  [SpecialRequestType.SUSPENSION]: 'suspension',
  [SpecialRequestType.CANCELACION]: 'cancelacion',
  [SpecialRequestType.NUEVA_SUSTENTACION]: 'sustentacion/nueva-fecha'
};

/**
 * Solicitudes del director durante el trabajo en curso y decisiones del
 * Consejo de Facultad, contra el backend. Las reglas (plazos, una sola vez,
 * etapa) las valida el backend y sus mensajes se muestran al usuario.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkSpecialRequestService {
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /** Registra la solicitud del director (la reanudación reactiva el trabajo de inmediato). */
  createSpecialRequest(thesisWorkId: string, solicitud: SpecialRequestSubmission): Observable<ThesisWork> {
    return this.enviarSolicitud(thesisWorkId, solicitud).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo)),
      tap(thesisWork => {
        const reanudacion = solicitud.requestType === SpecialRequestType.REANUDACION;
        this.eventBus.emit({
          type: reanudacion ? AppEventType.THESIS_REACTIVATED : AppEventType.SPECIAL_REQUEST_CREATED,
          targetUserIds: this.destinatarios(thesisWork, !reanudacion),
          payload: {
            thesisId: thesisWorkId,
            thesisWorkId,
            type: solicitud.requestType,
            thesisTitle: thesisWork.preliminaryDraftData?.proposalData?.title ?? ''
          }
        });
      })
    );
  }

  /** Decisión del Consejo sobre una solicitud pendiente, con la resolución en PDF. */
  evaluateSpecialRequest(thesisWorkId: string, request: SpecialRequest,
    decision: SpecialRequestDecision): Observable<ThesisWork> {
    const operacion = OPERACIONES[request.requestType];
    if (!operacion) throw new Error(`La solicitud de tipo ${request.requestType} no la decide el Consejo.`);
    const resultado = decision.status === stateList.APROBADO ? 'APROBADO' : 'NO_APROBADO';
    const datos: Record<string, unknown> = { resultado, observaciones: decision.resolutionDetails.trim() || null };
    if (request.requestType === SpecialRequestType.NUEVA_SUSTENTACION && decision.status === stateList.APROBADO) {
      datos['fechaHora'] = decision.newDateTime;
      datos['salon'] = decision.newLocation?.trim() || null;
    }
    return this.api.enviarArchivos(thesisWorkId, `${operacion}/decisiones-consejo`, datos,
      { archivo: decision.resolution }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo)),
      tap(thesisWork => this.eventBus.emit({
        type: AppEventType.SPECIAL_REQUEST_RESOLVED,
        targetUserIds: this.destinatarios(thesisWork, false),
        payload: {
          thesisId: thesisWorkId,
          thesisWorkId,
          status: decision.status,
          thesisTitle: thesisWork.preliminaryDraftData?.proposalData?.title ?? ''
        }
      }))
    );
  }

  private enviarSolicitud(id: string, solicitud: SpecialRequestSubmission): Observable<TrabajoGradoResponse> {
    switch (solicitud.requestType) {
      case SpecialRequestType.CAMBIO_TITULO:
        return this.api.enviarJson(id, 'cambio-objetivos', {
          titulo: solicitud.title, objetivos: solicitud.objectives, justificacion: solicitud.justification
        });
      case SpecialRequestType.PRORROGA:
        return this.api.enviarArchivos(id, 'prorroga', { meses: solicitud.months }, { archivo: solicitud.document });
      case SpecialRequestType.SUSPENSION:
        return this.api.enviarArchivos(id, 'suspension', null, { archivo: solicitud.document });
      case SpecialRequestType.REANUDACION:
        return this.api.enviarArchivos(id, 'suspension/reanudacion', null, { archivo: solicitud.document });
      case SpecialRequestType.CANCELACION:
        return this.api.enviarArchivos(id, 'cancelacion', null, { archivo: solicitud.document });
      case SpecialRequestType.NUEVA_SUSTENTACION:
        return this.api.enviarArchivos(id, 'sustentacion/nueva-fecha', null, { archivo: solicitud.document });
    }
  }

  private vista(trabajo: TrabajoGradoResponse): ThesisWork {
    const thesisWork = aTrabajoDeGrado(trabajo, this.vistas.contexto());
    if (!thesisWork) throw new Error('El trabajo de grado no está en curso.');
    return thesisWork;
  }

  /** Participantes del trabajo y, si se indica, los miembros del Consejo. */
  private destinatarios(thesisWork: ThesisWork, incluirConsejo: boolean): string[] {
    const ids = collectParticipantIds(thesisWork.preliminaryDraftData?.proposalData);
    if (incluirConsejo) {
      ids.push(...this.userService.users()
        .filter(user => user.roles.includes(UserRoleType.CONSEJO))
        .map(user => user.id));
    }
    return [...new Set(ids)];
  }
}
