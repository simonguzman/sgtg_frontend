import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aPropuesta } from '../../../core/mappers/trabajo-grado.mapper';
import { Proposal } from '../interfaces/proposal.interface';

/**
 * Documentos y decisiones de la propuesta contra el backend: el concepto del
 * Comité de Programa (con el acta firmada) y las nuevas versiones del formato A.
 */
@Injectable({
  providedIn: 'root'
})
export class ProposalDocumentService {
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /**
   * Registra el concepto del Comité de Programa: APROBADO (el trabajo pasa a
   * anteproyecto) o NO APROBADO (el director radica una nueva versión).
   *
   * @param signedFile acta o formato firmado que soporta la decisión
   */
  registerCommitteeDecision(proposalId: string, veredict: stateList, observations: string,
    signedFile: File): Observable<Proposal> {
    const resultado = veredict === stateList.APROBADO ? 'APROBADO' : 'NO_APROBADO';
    return this.api.enviarArchivos(proposalId, 'propuesta/decisiones', { resultado, observaciones: observations },
      { archivo: signedFile }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => aPropuesta(trabajo, this.vistas.contexto())),
      tap(propuesta => this.eventBus.emit({
        type: AppEventType.EVALUATION_ASSIGNED,
        targetUserIds: this.participantes(propuesta),
        payload: { proposalId: propuesta.id, veredict, proposalTitle: propuesta.title || '' }
      }))
    );
  }

  /** Radica una nueva versión del formato A (tras un NO APROBADO del Comité). */
  uploadCorrection(proposalId: string, file: File): Observable<Proposal> {
    return this.api.enviarArchivos(proposalId, 'propuesta', null, { archivo: file }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => aPropuesta(trabajo, this.vistas.contexto())),
      tap(propuesta => {
        const destinatarios = new Set(this.participantes(propuesta));
        this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.COMITE))
          .forEach(user => destinatarios.add(user.id));
        this.eventBus.emit({
          type: AppEventType.PROPOSAL_CORRECTION_UPLOADED,
          targetUserIds: Array.from(destinatarios),
          payload: { proposalId: propuesta.id, proposalTitle: propuesta.title || '' }
        });
      })
    );
  }

  private participantes(propuesta: Proposal): string[] {
    const ids = new Set<string>();
    propuesta.authors?.forEach(author => { if (author?.id) ids.add(author.id); });
    [propuesta.director, propuesta.codirector, propuesta.advisor].forEach(user => { if (user?.id) ids.add(user.id); });
    return Array.from(ids);
  }
}
