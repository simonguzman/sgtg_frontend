import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../users/services/user.service';
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { User } from '../../users/interfaces/user.interface';
import { IndexedDbListStoreService } from '../../../core/services/persistence/indexed-db-list-store.service';

const STORE_KEY = 'proposals';
const LEGACY_LOCALSTORAGE_KEY = 'proposals';

@Injectable({
  providedIn: 'root'
})
export class ProposalStorageService {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly dbStore = inject(IndexedDbListStoreService);

  // ← FIX: antes signal<Proposal[]>(this.getStoredProposals()) — lectura
  // síncrona de localStorage sin límite de tamaño para documentos en
  // base64, la misma causa raíz del QuotaExceededError ya corregido en
  // PreliminaryDraft y ThesisWork. Este archivo nunca había recibido ese
  // fix — arranca vacío y se hidrata desde IndexedDB en el constructor.
  private readonly _proposalsList = signal<Proposal[]>([]);
  private readonly hydrated = signal(false);

  public allProposals = this._proposalsList.asReadonly();
  public readonly isHydrated = this.hydrated.asReadonly();

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
  public proposals = computed(() => {
    const currentUser = this.authService.currentUser();
    const activeProposals = this._proposalsList().filter(proposal => proposal.isActive !== false && !proposal.isArchived);
    if (!currentUser) return [];
    if (this.hasPrivilegedAccess()) return activeProposals;
    return activeProposals.filter(proposal => this.canUserAccessProposal(proposal, currentUser.id));
  });

  constructor() {
    void this.hydrateFromIndexedDb();

    effect(() => {
      if (!this.hydrated()) return;
      const currentList = this._proposalsList();
      void this.dbStore.set(STORE_KEY, currentList).catch(error => {
        console.error('Error guardando propuestas en IndexedDB', error);
      });
    });
  }

  // ← FIX: getInitialData() puede lanzar (getMockUser lanza si el usuario
  // mock no existe). Antes, si eso pasaba DENTRO del catch, escapaba sin
  // que nada lo protegiera — convertía hydrateFromIndexedDb() en una
  // promesa rechazada, y como el constructor la dispara con `void`
  // (fire-and-forget), un rechazo no manejado crashea el proceso en
  // Node 15+, no solo falla un test.
  private async hydrateFromIndexedDb(): Promise<void> {
    try {
      const stored = await this.dbStore.get<Proposal[]>(STORE_KEY);
      if (stored && stored.length > 0) {
        this._proposalsList.set(stored);
        return;
      }
      const migrated = this.migrateFromLegacyLocalStorage();
      this._proposalsList.set(migrated ?? this.safeInitialData());
    } catch (error) {
      console.error('Error leyendo propuestas de IndexedDB', error);
      this._proposalsList.set(this.safeInitialData());
    } finally {
      this.hydrated.set(true);
    }
  }

  // ← NUEVO: getInitialData() ya no se llama directamente en ningún lado.
  // Este wrapper garantiza que hydrateFromIndexedDb() NUNCA rechace su
  // promesa — en el peor caso, arranca con un arreglo vacío en vez de
  // tumbar el proceso.
  private safeInitialData(): Proposal[] {
    try {
      return this.getInitialData();
    } catch (error) {
      console.error('Error construyendo datos iniciales de propuestas (usuarios mock no disponibles)', error);
      return [];
    }
  }

  /**
   * Migración de un solo uso: si ya tenías datos guardados con el esquema
   * anterior (localStorage), los recupera antes de que IndexedDB tome el
   * control, para no perder trabajo ya hecho.
   */
  private migrateFromLegacyLocalStorage(): Proposal[] | null {
    const stored = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as Proposal[];
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return parsed;
    } catch {
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return null;
    }
  }

  /**
   * Retorna una instantánea síncrona del estado actual de las propuestas.
   */
  public getProposalsListSnapshot(): Proposal[] {
    return this._proposalsList();
  }

  /**
   * Expone de forma segura el actualizador de la señal interna para mutaciones inmutables.
   */
  public updateProposals(mutator: (list: Proposal[]) => Proposal[]): void {
    this._proposalsList.update(mutator);
  }

  /**
   * Recupera una propuesta por su ID en formato asíncrono simulado.
   */
  public getById(id: string): Observable<Proposal | undefined> {
    const proposal = this._proposalsList().find(proposal => proposal.id === id);
    return of(proposal).pipe(delay(1000));
  }

  private getMockUser(id: string): User {
    const user = this.userService.getAllUsers().find(user => user.id === id);
    if (!user) {
      throw new Error(`Usuario con ID ${id} no encontrado en la base de datos de mocks.`);
    }
    return user;
  }

  private getInitialData(): Proposal[] {
    return [
      {
        id: 'prop-001',
        title: 'Frontend de las funcionalidades asociadas a la aplicación web para la Facultad de Ingeniería Electrónica...',
        modality: Modality.PP,
        description: 'Desarrollar un prototipo del FrontEnd...',
        state: stateList.APROBADO,
        authors: [this.getMockUser('user-001')],
        director: this.getMockUser('doc-005'),
        codirector: this.getMockUser('doc-001'),
        advisor: this.getMockUser('doc-002'),
        documents: [],
        evaluations: [],
        createdAt: new Date()
      },
      {
        id: 'prop-002',
        title: 'Análisis de vulnerabilidades en redes IoT...',
        modality: Modality.TI,
        description: 'Investigación sobre seguridad en protocolos Zigbee...',
        state: stateList.APROBADO_CON_OBSERVACIONES,
        authors: [this.getMockUser('user-001')],
        director: this.getMockUser('doc-005'),
        documents: [],
        evaluations: [],
        createdAt: new Date()
      },
      {
        id: 'prop-100',
        title: 'Sistema de control de asistencia mediante reconocimiento facial',
        modality: Modality.TI,
        description: 'Implementación de un sistema biométrico para aulas de clase...',
        state: stateList.APROBADO,
        authors: [this.getMockUser('user-001')],
        director: this.getMockUser('doc-001'),
        documents: [],
        evaluations: [],
        createdAt: new Date('2025-05-10'),
        isArchived: true,
        archivedAt: new Date('2025-11-20')
      }
    ];
  }
}
