import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { IndexedDbListStoreService } from '../../../core/services/persistence/indexed-db-list-store.service';

const STORE_KEY = 'thesisWorks';
const LEGACY_LOCALSTORAGE_KEY = 'thesisWorks';

@Injectable({ providedIn: 'root' })
export class ThesisWorkStorageService {
  private readonly authService = inject(AuthService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly preliminaryDraftStorage = inject(PreliminaryDraftStorageService);
  private readonly proposalStorage = inject(ProposalStorageService);
  private readonly dbStore = inject(IndexedDbListStoreService);

  private readonly _thesisWorksList = signal<ThesisWork[]>([]);
  private readonly hydrated = signal(false);

  public allThesisWorks = this._thesisWorksList.asReadonly();
  // ← NUEVO: expone la señal de hidratación para que los guards puedan
  // esperar a que IndexedDB termine de cargar antes de decidir.
  public readonly isHydrated = this.hydrated.asReadonly();
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

  public thesisWorks = computed(() => {
    const currentUser = this.authService.currentUser();
    const activeWorks = this._thesisWorksList().filter(thesisWork => !thesisWork.isArchived);
    if (!currentUser) return [];
    let filteredWorks: ThesisWork[] = [];
    if (this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DECANATURA,
      UserRoleType.CONSEJO
    ])) {
      filteredWorks = activeWorks;
    } else {
      filteredWorks = activeWorks.filter(thesisWork => this.canUserAccessThesisWork(thesisWork, currentUser.id));
    }
    return [...filteredWorks].sort((a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  });

  constructor() {
    void this.hydrateFromIndexedDb();

    effect(() => {
      if (!this.hydrated()) return;
      const currentList = this._thesisWorksList();
      void this.dbStore.set(STORE_KEY, currentList).catch(error => {
        console.error('Error guardando trabajos de grado en IndexedDB', error);
      });
    });

    effect(() => {
      // ← FIX: mismo guard que el effect de persistencia. Sin esto, este
      // effect podía correr con _thesisWorksList todavía vacío (antes de
      // que su propia hidratación terminara) mientras
      // preliminaryDraftService ya tenía datos reales, creando entradas
      // "fantasma" con thesisWorkId nuevos para anteproyectos que ya
      // tenían un ThesisWork real esperando en IndexedDB.
      if (!this.hydrated()) return;
      const approvedDrafts = this.preliminaryDraftService.allPreliminaryDrafts()
        .filter(draft => draft.state === stateList.APROBADO);
      this._thesisWorksList.update(currentWorks => {
        let hasChanges = false;
        const updatedWorks = [...currentWorks];
        approvedDrafts.forEach(draft => {
          const existingIndex = updatedWorks.findIndex(w => w.preliminaryDraftId === draft.preliminaryDraftId);
          if (existingIndex === -1) {
            updatedWorks.unshift({
              thesisWorkId: crypto.randomUUID(),
              preliminaryDraftId: draft.preliminaryDraftId!,
              preliminaryDraftData: draft,
              documents: [],
              advances: [],
              evaluations: [],
              sustentations: [],
              specialRequests: [],
              state: stateList.EN_DESARROLLO,
              createdDate: new Date(),
              isArchived: false
            });
            hasChanges = true;
          } else {
            const currentDraftData = updatedWorks[existingIndex].preliminaryDraftData;
            if (currentDraftData.maximumDeliveryDate !== draft.maximumDeliveryDate) {
              updatedWorks[existingIndex] = {
                ...updatedWorks[existingIndex],
                preliminaryDraftData: draft
              };
              hasChanges = true;
            }
          }
        });
        return hasChanges ? updatedWorks : currentWorks;
      });
    });
  }

  private async hydrateFromIndexedDb(): Promise<void> {
    try {
      const stored = await this.dbStore.get<ThesisWork[]>(STORE_KEY);
      if (stored && stored.length > 0) {
        this._thesisWorksList.set(stored);
      } else {
        const migrated = this.migrateFromLegacyLocalStorage();
        this._thesisWorksList.set(migrated ?? []);
      }
    } catch (error) {
      console.error('Error leyendo trabajos de grado de IndexedDB', error);
      this._thesisWorksList.set([]);
    } finally {
      this.hydrated.set(true);
    }
  }

  private migrateFromLegacyLocalStorage(): ThesisWork[] | null {
    const stored = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as ThesisWork[];
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return parsed;
    } catch {
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return null;
    }
  }

  public updateWork(id: string, mutator: (work: ThesisWork) => ThesisWork): void {
    this._thesisWorksList.update(list =>
      list.map(work => {
        if (work.thesisWorkId === id) {
          const updatedWork = mutator(work);
          if (updatedWork.state === stateList.CANCELADO && !updatedWork.isArchived) {
            updatedWork.isArchived = true;
          }
          if (updatedWork.isArchived && !work.isArchived) {
            this.triggerCascadeArchive(updatedWork);
          }
          return updatedWork;
        }
        return work;
      })
    );
  }

  private triggerCascadeArchive(work: ThesisWork): void {
    try {
      const draftId = work.preliminaryDraftId;
      const proposalId = work.preliminaryDraftData?.proposalId;
      const now = new Date();
      if (draftId && this.preliminaryDraftStorage) {
        this.preliminaryDraftStorage.updateDraft(draftId, draft => ({
          ...draft,
          isArchived: true,
          archivedAt: now
        }));
      }
      if (proposalId && this.proposalStorage) {
        this.proposalStorage.updateProposals(list =>
          list.map(p => p.id === proposalId ? { ...p, isArchived: true, archivedAt: now } : p)
        );
      }
    } catch (error) {
      console.error('Error al ejecutar el archivado en cascada:', error);
    }
  }

  public getById(id: string): Observable<ThesisWork | undefined> {
    const work = this._thesisWorksList().find(w => w.thesisWorkId === id);
    return of(work).pipe(delay(500));
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
