import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/models/user-role';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryDraftStorageService {
  private readonly authService = inject(AuthService);
  private readonly _preliminaryDraftsList = signal<PreliminaryDraft[]>(this.getStoredPreliminaryDrafts());

  public preliminaryDrafts = computed(() => {
    const currentUser = this.authService.currentUser();
    const allPreliminaryDrafts = this._preliminaryDraftsList();
    if (!currentUser) return [];

    if (this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.COMITE,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ])) {
      return allPreliminaryDrafts;
    }

    return allPreliminaryDrafts.filter(preliminaryDraft =>
      this.canUserAccessPreliminaryDraft(preliminaryDraft, currentUser.id)
    );
  });

  constructor() {
    effect(() => {
      localStorage.setItem('preliminaryDrafts', JSON.stringify(this._preliminaryDraftsList()));
    });
  }

  /**
   * Muta el estado de un Anteproyecto específico de forma segura e inmutable.
   */
  public updateDraft(id: string, mutator: (preliminaryDraft: PreliminaryDraft) => PreliminaryDraft): void {
    this._preliminaryDraftsList.update(list =>
      list.map(preliminaryDraft => preliminaryDraft.preliminaryDraftId === id ? mutator(preliminaryDraft) : preliminaryDraft)
    );
  }

  /**
   * Agrega un nuevo anteproyecto a la lista global.
   */
  public addDraft(preliminaryDraft: PreliminaryDraft): void {
    this._preliminaryDraftsList.update(list => [preliminaryDraft, ...list]);
  }

  /**
   * Elimina un anteproyecto de la lista global.
   */
  public removeDraft(id: string): void {
    this._preliminaryDraftsList.update(list =>
      list.filter(preliminaryDraft => preliminaryDraft.preliminaryDraftId !== id)
    );
  }

  /**
   * Busca un anteproyecto por ID y lo retorna como Observable.
   */
  public getById(id: string): Observable<PreliminaryDraft | undefined> {
    const preliminaryDraft = this._preliminaryDraftsList().find(preliminaryDraft => preliminaryDraft.preliminaryDraftId === id);
    return of(preliminaryDraft).pipe(delay(500));
  }

  private getStoredPreliminaryDrafts(): PreliminaryDraft[] {
    const stored = localStorage.getItem('preliminaryDrafts');
    return stored ? JSON.parse(stored) : [];
  }

  private canUserAccessPreliminaryDraft(preliminaryDraft: PreliminaryDraft, userId: string): boolean {
    if (!preliminaryDraft.proposalData) return false;
    const proposal = preliminaryDraft.proposalData;
    const isDirector = proposal.director?.id === userId;
    const isCodirector = proposal.codirector?.id === userId;
    const isAdvisor = proposal.advisor?.id === userId;

    const isAuthor = proposal.authors?.some(author =>
      typeof author === 'string' ? author === userId : (author as User)?.id === userId
    ) ?? false;

    const isAssignedEvaluator = preliminaryDraft.evaluators?.some(
      evaluator => evaluator.id === userId
    ) ?? false;

    const hasEvaluation = preliminaryDraft.evaluations?.some(
      evaluation => evaluation?.id === userId
    ) ?? false;

    return isDirector || isCodirector || isAdvisor || isAuthor || isAssignedEvaluator || hasEvaluation;
  }
}
