import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from '../../../core/services/auth/auth.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

/**
 * Propuestas del usuario en sesión. Ya no se guardan en el navegador: son la
 * vista "propuesta" de los trabajos de grado del backend
 * (`TrabajoGradoVistasService`), con el id del trabajo.
 */
@Injectable({
  providedIn: 'root'
})
export class ProposalStorageService {
  private readonly authService = inject(AuthService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /** Todas las propuestas cargadas (incluidas las archivadas). */
  public readonly allProposals = this.vistas.propuestas;
  /** true cuando terminó la primera carga desde el backend. */
  public readonly isHydrated = this.vistas.cargado;

  private readonly PRIVILEGED_ROLES = [UserRoleType.ADMINISTRADOR, UserRoleType.COMITE];

  public hasPrivilegedAccess(): boolean {
    return this.authService.hasAnyRole(this.PRIVILEGED_ROLES);
  }

  public canUserAccessProposal(proposal: Proposal, userId: string): boolean {
    const isAuthor = proposal.authors?.some(author => author.id === userId);
    const isDirector = proposal.director?.id === userId;
    const isCodirector = proposal.codirector?.id === userId;
    const isAdvisor = proposal.advisor?.id === userId;
    return isAuthor || isDirector || isCodirector || isAdvisor;
  }

  public canUserViewProposal(proposal: Proposal, userId: string): boolean {
    return this.hasPrivilegedAccess() || this.canUserAccessProposal(proposal, userId);
  }

  /**
   * Señal computada reactiva que expone las propuestas activas filtradas por el rol
   * y los privilegios de participación del usuario autenticado.
   */
  public readonly proposals = computed(() => {
    const currentUser = this.authService.currentUser();
    const activeProposals = this.allProposals().filter(proposal => proposal.isActive !== false && !proposal.isArchived);
    if (!currentUser) return [];
    if (this.hasPrivilegedAccess()) return activeProposals;
    return activeProposals.filter(proposal => this.canUserAccessProposal(proposal, currentUser.id));
  });

  /** Instantánea síncrona de todas las propuestas. */
  public getProposalsListSnapshot(): Proposal[] {
    return this.allProposals();
  }

  /** Propuesta por id (de memoria o del backend). */
  public getById(id: string): Observable<Proposal | undefined> {
    return this.vistas.propuesta(id);
  }
}
