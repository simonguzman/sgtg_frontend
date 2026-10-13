import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';

/**
 * Trabajos de grado del usuario en sesión. Ya no se guardan en el navegador:
 * son la vista "trabajo de grado" de los trabajos del backend
 * (`TrabajoGradoVistasService`), con el id del trabajo. Un trabajo existe
 * desde que el Consejo aprueba su anteproyecto.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkStorageService {
  private readonly authService = inject(AuthService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /** Todos los trabajos cargados (incluidos los cerrados). */
  public readonly allThesisWorks = this.vistas.trabajosDeGrado;
  /** true cuando terminó la primera carga desde el backend. */
  public readonly isHydrated = this.vistas.cargado;

  private readonly PRIVILEGED_ROLES = [
    UserRoleType.ADMINISTRADOR,
    UserRoleType.DECANATURA,
    UserRoleType.CONSEJO
  ];

  public hasPrivilegedAccess(): boolean {
    return this.authService.hasAnyRole(this.PRIVILEGED_ROLES);
  }

  public canUserViewThesisWork(work: ThesisWork, userId: string): boolean {
    return this.hasPrivilegedAccess() || this.canUserAccessThesisWork(work, userId);
  }

  /** Trabajos activos visibles para el usuario, del más reciente al más antiguo. */
  public readonly thesisWorks = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];
    const activeWorks = this.allThesisWorks().filter(thesisWork => !thesisWork.isArchived);
    const filteredWorks = this.hasPrivilegedAccess()
      ? activeWorks
      : activeWorks.filter(thesisWork => this.canUserAccessThesisWork(thesisWork, currentUser.id));
    return [...filteredWorks].sort((a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  });

  /**
   * Sin efecto: el estado de los trabajos lo define el backend. Se conserva
   * para los flujos simulados de la fase 6 (entrega final, sustentación), que
   * se reemplazarán en esa fase.
   */
  public updateWork(_id: string, _mutator: (work: ThesisWork) => ThesisWork): void {
    // Intencionalmente vacío
  }

  /** Trabajo de grado por id (de memoria o del backend). */
  public getById(id: string): Observable<ThesisWork | undefined> {
    return this.vistas.trabajoDeGrado(id);
  }

  private canUserAccessThesisWork(work: ThesisWork, userId: string): boolean {
    const proposal = work.preliminaryDraftData?.proposalData;
    if (!proposal) return false;
    const isDirector = proposal.director?.id === userId;
    const isCodirector = proposal.codirector?.id === userId;
    const isAdvisor = proposal.advisor?.id === userId;
    const isAuthor = proposal.authors?.some(author =>
      typeof author === 'string' ? author === userId : (author as User)?.id === userId
    ) ?? false;
    const isJuror = work.sustentations?.some(s =>
      s.assignedJurors?.some(juror => juror.id === userId)
    ) ?? false;
    return isDirector || isCodirector || isAdvisor || isAuthor || isJuror;
  }
}
