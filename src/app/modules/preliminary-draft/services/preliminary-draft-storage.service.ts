import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { PRELIMINARY_DRAFTS_LIST } from '../mocks/preliminary-drafts.mock';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftStorageService {
  private readonly authService = inject(AuthService);
  private readonly STORAGE_KEY = 'preliminaryDrafts';

  private readonly _preliminaryDraftsList = signal<PreliminaryDraft[]>(
    this.getStoredPreliminaryDrafts()
  );

  public readonly allPreliminaryDrafts = this._preliminaryDraftsList.asReadonly();

  public readonly preliminaryDrafts = computed(() => {
    const currentUser = this.authService.currentUser();
    const activepreliminaryDrafts = this._preliminaryDraftsList().filter(preliminaryDraft => !preliminaryDraft.isArchived);
    if (!currentUser) return [];

    if (this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.COMITE,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ])) {
      return activepreliminaryDrafts;
    }

    return activepreliminaryDrafts.filter(preliminaryDraft => this.canUserAccessPreliminaryDraft(preliminaryDraft, currentUser.id));
  });

  constructor() {
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._preliminaryDraftsList()));
    });
  }

  public updateDraft(id: string, mutator: (preliminaryDraft: PreliminaryDraft) => PreliminaryDraft): void {
    this._preliminaryDraftsList.update(list =>
      list.map(preliminaryDraft => preliminaryDraft.preliminaryDraftId === id ? mutator(preliminaryDraft) : preliminaryDraft)
    );
  }

  public addDraft(preliminaryDraft: PreliminaryDraft): void {
    this._preliminaryDraftsList.update(list => [preliminaryDraft, ...list]);
  }

  public removeDraft(id: string): void {
    this._preliminaryDraftsList.update(list =>
      list.filter(preliminaryDraft => preliminaryDraft.preliminaryDraftId !== id)
    );
  }

  public getById(id: string): Observable<PreliminaryDraft | undefined> {
    const preliminaryDraft = this._preliminaryDraftsList().find(preliminaryDraft => preliminaryDraft.preliminaryDraftId === id);
    return of(preliminaryDraft).pipe(delay(500));
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private getStoredPreliminaryDrafts(): PreliminaryDraft[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored && stored !== '[]') {
      try {
        return JSON.parse(stored);
      } catch {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
    return PRELIMINARY_DRAFTS_LIST;
  }

  private canUserAccessPreliminaryDraft(preliminaryDraft: PreliminaryDraft, userId: string): boolean {
    const proposal = preliminaryDraft.proposalData;
    if (!proposal) return false;

    const isDirector   = proposal.director?.id === userId;
    const isCodirector = proposal.codirector?.id === userId;
    const isAdvisor    = proposal.advisor?.id === userId;

    const isAuthor = proposal.authors?.some(author =>
      typeof author === 'string' ? author === userId : (author as User)?.id === userId
    ) ?? false;

    const isAssignedEvaluator = preliminaryDraft.evaluators?.some(evaluator => evaluator.id === userId) ?? false;
    const hasEvaluation = preliminaryDraft.evaluations?.some(evaluator => evaluator?.id === userId) ?? false;

    return isDirector || isCodirector || isAdvisor || isAuthor || isAssignedEvaluator || hasEvaluation;
  }
}
