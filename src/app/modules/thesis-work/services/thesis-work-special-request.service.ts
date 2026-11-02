import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { stateList } from '../../../core/enums/state.enum';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aTrabajoDeGrado } from '../../../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
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

/**
 * Decisión sobre una solicitud: la del Consejo de Facultad, con la resolución
 * (obligatoria), o el aval del Comité al cambio de título y objetivos, con el
 * acta opcional.
 */
export interface SpecialRequestDecision {
  status: stateList.APROBADO | stateList.NO_APROBADO;
  resolutionDetails: string;
  /** Resolución del Consejo o, en el aval del Comité, el acta (opcional) */
  resolution: File | null;
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
 * Solicitudes del director durante el trabajo en curso, el aval del Comité al
 * cambio de título y objetivos y las decisiones del Consejo de Facultad, contra
 * el backend. Las reglas (plazos, una sola vez,
 * etapa) las valida el backend y sus mensajes se muestran al usuario.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkSpecialRequestService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /** Registra la solicitud del director (la reanudación reactiva el trabajo de inmediato). */
  createSpecialRequest(thesisWorkId: string, solicitud: SpecialRequestSubmission): Observable<ThesisWork> {
    return this.enviarSolicitud(thesisWorkId, solicitud).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  /**
   * Decisión sobre una solicitud pendiente: el aval del Comité si el cambio de
   * título y objetivos lo espera, o la decisión del Consejo con la resolución en PDF.
   */
  evaluateSpecialRequest(thesisWorkId: string, request: SpecialRequest,
    decision: SpecialRequestDecision): Observable<ThesisWork> {
    const operacion = OPERACIONES[request.requestType];
    if (!operacion) throw new Error(`La solicitud de tipo ${request.requestType} no la decide el Consejo.`);
    const resultado = decision.status === stateList.APROBADO ? 'APROBADO' : 'NO_APROBADO';
    const datos: Record<string, unknown> = { resultado, observaciones: decision.resolutionDetails.trim() || null };
    const organo = request.pendingWith === 'COMITE' ? 'decisiones-comite' : 'decisiones-consejo';
    if (request.requestType === SpecialRequestType.NUEVA_SUSTENTACION && decision.status === stateList.APROBADO) {
      datos['fechaHora'] = decision.newDateTime;
      datos['salon'] = decision.newLocation?.trim() || null;
    }
    return this.api.enviarArchivos(thesisWorkId, `${operacion}/${organo}`, datos,
      { archivo: decision.resolution }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
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
}
