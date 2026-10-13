import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';

/**
 * Anteproyectos del usuario en sesión. Ya no se guardan en el navegador: son la
 * vista "anteproyecto" de los trabajos de grado del backend
 * (`TrabajoGradoVistasService`), con el id del trabajo. Un trabajo tiene
 * anteproyecto desde que se radica su primera versión.
 */
@Injectable({ providedIn: 'root' })
export class PreliminaryDraftStorageService {
  private readonly authService = inject(AuthService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /** Todos los anteproyectos cargados (incluidos los archivados). */
  public readonly allPreliminaryDrafts = this.vistas.anteproyectos;
  /** true cuando terminó la primera carga desde el backend. */
  public readonly isHydrated = this.vistas.cargado;

  private readonly PRIVILEGED_ROLES = [
    UserRoleType.ADMINISTRADOR,
    UserRoleType.COMITE,
    UserRoleType.JEFE_DEP,
    UserRoleType.CONSEJO
  ];

  public hasPrivilegedAccess(): boolean {
    return this.authService.hasAnyRole(this.PRIVILEGED_ROLES);
  }

  public canUserViewPreliminaryDraft(preliminaryDraft: PreliminaryDraft, userId: string): boolean {
    return this.hasPrivilegedAccess() || this.canUserAccessPreliminaryDraft(preliminaryDraft, userId);
  }

  /** Anteproyectos activos visibles para el usuario según su rol y participación. */
  public readonly preliminaryDrafts = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];
    const activePreliminaryDrafts = this.allPreliminaryDrafts().filter(draft => !draft.isArchived);
    if (this.hasPrivilegedAccess()) return activePreliminaryDrafts;
    return activePreliminaryDrafts.filter(draft => this.canUserAccessPreliminaryDraft(draft, currentUser.id));
  });

  /**
   * Sin efecto: el estado de los anteproyectos lo define el backend. Se conservan
   * para los flujos simulados de los módulos aún no integrados (trabajo de grado),
   * que se reemplazarán en sus fases.
   */
  public updateDraft(_id: string, _mutator: (preliminaryDraft: PreliminaryDraft) => PreliminaryDraft): void {
    // Intencionalmente vacío
  }

  /** Sin efecto (ver {@link updateDraft}). */
  public addDraft(_preliminaryDraft: PreliminaryDraft): void {
    // Intencionalmente vacío
  }

  /** Sin efecto (ver {@link updateDraft}). */
  public removeDraft(_id: string): void {
    // Intencionalmente vacío
  }

  /** Anteproyecto por id (de memoria o del backend). */
  public getById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.vistas.anteproyecto(id);
  }

  private canUserAccessPreliminaryDraft(preliminaryDraft: PreliminaryDraft, userId: string): boolean {
    const proposal = preliminaryDraft.proposalData;
    if (!proposal) return false;
    const isDirector = proposal.director?.id === userId;
    const isCodirector = proposal.codirector?.id === userId;
    const isAdvisor = proposal.advisor?.id === userId;
    const isAuthor = proposal.authors?.some(author =>
      typeof author === 'string' ? author === userId : (author as User)?.id === userId
    ) ?? false;
    const isAssignedEvaluator = preliminaryDraft.evaluators?.some(evaluator => evaluator.id === userId) ?? false;
    return isDirector || isCodirector || isAdvisor || isAuthor || isAssignedEvaluator;
  }
}
