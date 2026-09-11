import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { PRELIMINARY_DRAFTS_LIST } from '../mocks/preliminary-drafts.mock';
import { IndexedDbListStoreService } from '../../../core/services/persistence/indexed-db-list-store.service';

const STORE_KEY = 'preliminaryDrafts';
// Mismo nombre que usaba localStorage — se lee una sola vez para migrar
// datos de prueba existentes y luego se limpia.
const LEGACY_LOCALSTORAGE_KEY = 'preliminaryDrafts';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftStorageService {
  private readonly authService = inject(AuthService);
  private readonly dbStore = inject(IndexedDbListStoreService);

  // ← FIX CENTRAL: antes se leía localStorage de forma síncrona en la
  // inicialización del signal. IndexedDB es asíncrono, así que arranca
  // vacío y se hidrata en el constructor — ver hydrateFromIndexedDb().
  private readonly _preliminaryDraftsList = signal<PreliminaryDraft[]>([]);
  public readonly allPreliminaryDrafts = this._preliminaryDraftsList.asReadonly();
  private readonly hydrated = signal(false);
  private readonly PRIVILEGED_ROLES = [
    UserRoleType.ADMINISTRADOR,
    UserRoleType.COMITE,
    UserRoleType.JEFE_DEP,
    UserRoleType.CONSEJO
  ];

  public readonly isHydrated = this.hydrated.asReadonly();

  public hasPrivilegedAccess(): boolean {
    return this.authService.hasAnyRole(this.PRIVILEGED_ROLES);
  }

  public canUserViewPreliminaryDraft(preliminaryDraft: PreliminaryDraft, userId: string): boolean {
    return this.hasPrivilegedAccess() || this.canUserAccessPreliminaryDraft(preliminaryDraft, userId);
  }

  public readonly preliminaryDrafts = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];
    const activePreliminaryDrafts = this._preliminaryDraftsList().filter(
      draft => !draft.isArchived
    );
    const hasPrivilegedRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.COMITE,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ]);
    if (hasPrivilegedRole) {
      return activePreliminaryDrafts;
    }
    return activePreliminaryDrafts.filter(draft =>
      this.canUserAccessPreliminaryDraft(draft, currentUser.id)
    );
  });

  constructor() {
    void this.hydrateFromIndexedDb();

    effect(() => {
      // ← Mientras no haya terminado la hidratación, este guard corta la
      // ejecución ANTES de leer _preliminaryDraftsList() — por cómo
      // Angular rastrea dependencias en effect(), eso significa que el
      // effect todavía no "depende" de la lista, solo de `hydrated`. Sin
      // esto, se sobrescribiría IndexedDB con [] apenas arranca la app,
      // antes de que la lectura asíncrona real termine.
      if (!this.hydrated()) return;
      const currentList = this._preliminaryDraftsList();
      void this.dbStore.set(STORE_KEY, currentList).catch(error => {
        console.error('Error guardando anteproyectos en IndexedDB', error);
      });
    });
  }

  private async hydrateFromIndexedDb(): Promise<void> {
    try {
      const stored = await this.dbStore.get<PreliminaryDraft[]>(STORE_KEY);
      if (stored && stored.length > 0) {
        this._preliminaryDraftsList.set(stored);
      } else {
        const migrated = this.migrateFromLegacyLocalStorage();
        this._preliminaryDraftsList.set(migrated ?? PRELIMINARY_DRAFTS_LIST);
      }
    } catch (error) {
      console.error('Error leyendo anteproyectos de IndexedDB', error);
      this._preliminaryDraftsList.set(PRELIMINARY_DRAFTS_LIST);
    } finally {
      this.hydrated.set(true);
    }
  }

  /**
   * Migración de un solo uso: si ya tenías datos de prueba guardados con
   * el esquema anterior (localStorage), los recupera antes de que
   * IndexedDB tome el control, para no perder trabajo ya hecho.
   */
  private migrateFromLegacyLocalStorage(): PreliminaryDraft[] | null {
    const stored = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as PreliminaryDraft[];
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return parsed;
    } catch {
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return null;
    }
  }

  public updateDraft(
    id: string,
    mutator: (preliminaryDraft: PreliminaryDraft) => PreliminaryDraft
  ): void {
    this._preliminaryDraftsList.update(list =>
      list.map(draft => (draft.preliminaryDraftId === id ? mutator(draft) : draft))
    );
  }

  public addDraft(preliminaryDraft: PreliminaryDraft): void {
    this._preliminaryDraftsList.update(list => [preliminaryDraft, ...list]);
  }

  public removeDraft(id: string): void {
    this._preliminaryDraftsList.update(list =>
      list.filter(draft => draft.preliminaryDraftId !== id)
    );
  }

  public getById(id: string): Observable<PreliminaryDraft | undefined> {
    const preliminaryDraft = this._preliminaryDraftsList().find(
      draft => draft.preliminaryDraftId === id
    );
    return of(preliminaryDraft).pipe(delay(500));
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
    const isAssignedEvaluator = preliminaryDraft.evaluators?.some(
      evaluator => evaluator.id === userId
    ) ?? false;
    const hasEvaluation = preliminaryDraft.evaluations?.some(
      evaluation => evaluation?.evaluatorId === userId
    ) ?? false;
    return isDirector || isCodirector || isAdvisor || isAuthor || isAssignedEvaluator || hasEvaluation;
  }
}
