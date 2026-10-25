import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { ProposalStorageService } from './proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { TrabajoGradoAnulacionService } from '../../../core/services/trabajo-grado/trabajo-grado-anulacion.service';
import { AuthApiService } from '../../../core/services/auth/auth-api.service';
import { aPropuesta } from '../../../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';

import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';

/**
 * Operaciones de la propuesta contra el backend. La propuesta es la vista de
 * un trabajo de grado: crearla crea el trabajo y radica el formato A.
 */
@Injectable({
  providedIn: 'root'
})
export class ProposalApiService {
  private readonly storage = inject(ProposalStorageService);
  private readonly userService = inject(UserService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly anulacion = inject(TrabajoGradoAnulacionService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);
  private readonly authApi = inject(AuthApiService);

  getProposalById(id: string): Observable<Proposal | undefined> {
    return this.storage.getById(id);
  }

  /**
   * Crea el trabajo de grado (investigación, o práctica profesional con su
   * carta de aceptación) y radica el formato A. El backend asigna los roles
   * de director, codirector y asesor: se refrescan la sesión y los usuarios.
   */
  createProposal(proposal: Proposal): Observable<Proposal> {
    const formatoA = proposal.attachments?.proposal;
    if (!formatoA) return throwError(() => new Error('Debe adjuntar el formato de la propuesta.'));

    const creacion = proposal.modality === Modality.PP
      ? this.api.enviarArchivos(null, 'practica-profesional', {
        ...this.datosDeLaPropuesta(proposal),
        estudianteId: Number(proposal.authors[0]?.id),
        codirectorId: this.idNumerico(proposal.codirector?.id),
        asesor: this.asesor(proposal)
      }, { archivo: proposal.attachments?.acceptanceLetter })
      : this.api.enviarJson(null, 'investigacion', {
        ...this.datosDeLaPropuesta(proposal),
        estudiantesIds: proposal.authors.map(author => Number(author.id)),
        codirectorId: this.idNumerico(proposal.codirector?.id),
        asesor: null
      });

    return creacion.pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      switchMap(trabajo => this.api.enviarArchivos(trabajo.id, 'propuesta', null, { archivo: formatoA })),
      tap(trabajo => {
        this.store.upsert(trabajo);
        this.refrescarRoles();
      }),
      map(trabajo => this.vista(trabajo))
    );
  }

  /**
   * Corrige título, objetivos, descripción y línea de investigación; si se
   * adjuntó una nueva carta de aceptación, la carga como nueva versión, y si
   * se adjuntó un nuevo formato A, lo radica como nueva versión. El backend
   * solo lo permite antes de radicar o después de un NO APROBADO del Comité,
   * por eso la carta va antes del formato A.
   */
  updateProposal(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    const actual = this.storage.getProposalsListSnapshot().find(p => p.id === id);
    const propuesta = { ...actual, ...changes } as Proposal;
    const formatoA = changes.attachments?.proposal;
    const carta = changes.attachments?.acceptanceLetter;

    return this.api.actualizar(id, 'propuesta', this.datosDeLaPropuesta(propuesta)).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      switchMap(trabajo => carta
        ? this.api.enviarArchivos(trabajo.id, 'propuesta/carta-aceptacion', null, { archivo: carta })
        : of(trabajo)),
      tap(trabajo => this.store.upsert(trabajo)),
      switchMap(trabajo => formatoA
        ? this.api.enviarArchivos(trabajo.id, 'propuesta', null, { archivo: formatoA })
        : of(trabajo)),
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  /** Anulación del director (borrado lógico): el trabajo queda cancelado y pasa al historial. */
  annulProposal(id: string, justification: string): Observable<Proposal> {
    return this.anulacion.anular(id, justification).pipe(map(trabajo => this.vista(trabajo)));
  }

  // ── Apoyo ─────────────────────────────────────────────────────────────────

  /** Título, objetivos (el primero es el general), descripción y línea de investigación. */
  private datosDeLaPropuesta(proposal: Proposal) {
    const objetivos = (proposal.objectives?.length ? proposal.objectives : [proposal.description])
      .map(objetivo => objetivo?.trim())
      .filter(objetivo => !!objetivo);
    const descripcion = proposal.description?.trim();
    return {
      titulo: proposal.title,
      objetivos,
      descripcion: descripcion && descripcion !== objetivos[0] ? descripcion : null,
      lineaInvestigacion: proposal.lineOfResearch?.trim() || null
    };
  }

  /** Asesor de la práctica profesional: usuario con rol ASESOR y su organización. */
  private asesor(proposal: Proposal) {
    if (!proposal.advisor) return null;
    return { usuarioId: this.idNumerico(proposal.advisor.id), organizacion: proposal.organization?.trim() || null,
      externo: false };
  }

  private idNumerico(id: string | undefined): number | null {
    return id ? Number(id) : null;
  }

  private vista(trabajo: TrabajoGradoResponse): Proposal {
    return aPropuesta(trabajo, this.vistas.contexto());
  }

  /** El backend agregó roles de contexto: se refrescan la sesión y la lista de usuarios. */
  private refrescarRoles(): void {
    this.authApi.refreshCurrentUser().pipe(catchError(() => of(undefined))).subscribe();
    this.userService.loadUsers();
  }
}
