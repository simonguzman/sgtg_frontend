import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { stateList } from '../../../core/enums/state.enum';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aPropuesta } from '../../../core/mappers/trabajo-grado.mapper';
import { Proposal } from '../interfaces/proposal.interface';

/**
 * Documentos y decisiones de la propuesta contra el backend: el concepto del
 * Comité de Programa (con el documento de respuesta) y las nuevas versiones del
 * formato A. Las notificaciones las genera el backend.
 */
@Injectable({
  providedIn: 'root'
})
export class ProposalDocumentService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /**
   * Registra el concepto del Comité de Programa: APROBADO (el trabajo pasa a
   * anteproyecto) o NO APROBADO (el director radica una nueva versión).
   *
   * @param signedFile Formato A firmado por el Comité
   */
  registerCommitteeDecision(proposalId: string, veredict: stateList, observations: string,
    signedFile: File): Observable<Proposal> {
    const resultado = veredict === stateList.APROBADO ? 'APROBADO' : 'NO_APROBADO';
    return this.api.enviarArchivos(proposalId, 'propuesta/decisiones', { resultado, observaciones: observations },
      { archivo: signedFile }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => aPropuesta(trabajo, this.vistas.contexto()))
    );
  }

  /**
   * Radica una nueva versión del formato A (tras un NO APROBADO del Comité).
   * En práctica profesional va con la nueva carta de aceptación, en la misma
   * petición: el backend no radica la corrección sin ella, y si la radicación
   * falla tampoco registra la carta.
   */
  uploadCorrection(proposalId: string, file: File, acceptanceLetter: File | null = null): Observable<Proposal> {
    return this.api.enviarArchivos(proposalId, 'propuesta', null, { archivo: file, cartaAceptacion: acceptanceLetter }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => aPropuesta(trabajo, this.vistas.contexto()))
    );
  }
}
