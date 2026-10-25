import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { evaluaAnteproyectoEnCurso } from '../../../core/helpers/evaluacion-pendiente.helper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
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
  private readonly store = inject(TrabajoGradoStoreService);

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

  /**
   * Anteproyectos activos visibles para el usuario según su rol y participación.
   * El evaluador ve los que tiene asignados mientras el anteproyecto siga en
   * curso; cuando decide el Consejo pasan a su historial.
   */
  public readonly preliminaryDrafts = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];
    const activePreliminaryDrafts = this.allPreliminaryDrafts().filter(draft => !draft.isArchived);
    if (this.hasPrivilegedAccess()) return activePreliminaryDrafts;
    const trabajos = this.store.porId();
    return activePreliminaryDrafts.filter(draft => this.isParticipant(draft, currentUser.id)
      || this.evaluatesInProgress(trabajos.get(draft.preliminaryDraftId ?? ''), currentUser.id));
  });

  private evaluatesInProgress(trabajo: TrabajoGradoResponse | undefined, userId: string): boolean {
    return !!trabajo && evaluaAnteproyectoEnCurso(trabajo, userId);
  }

  /** Anteproyecto por id (de memoria o del backend). */
  public getById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.vistas.anteproyecto(id);
  }

  private canUserAccessPreliminaryDraft(preliminaryDraft: PreliminaryDraft, userId: string): boolean {
    const isAssignedEvaluator = preliminaryDraft.evaluators?.some(evaluator => evaluator.id === userId) ?? false;
    return this.isParticipant(preliminaryDraft, userId) || isAssignedEvaluator;
  }

  /** Estudiante, director, codirector o asesor del trabajo. */
  private isParticipant(preliminaryDraft: PreliminaryDraft, userId: string): boolean {
    const proposal = preliminaryDraft.proposalData;
    if (!proposal) return false;
    const isDirector = proposal.director?.id === userId;
    const isCodirector = proposal.codirector?.id === userId;
    const isAdvisor = proposal.advisor?.id === userId;
    const isAuthor = proposal.authors?.some(author =>
      typeof author === 'string' ? author === userId : (author as User)?.id === userId
    ) ?? false;
    return isDirector || isCodirector || isAdvisor || isAuthor;
  }
}
