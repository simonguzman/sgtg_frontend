import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';

import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/models/user-role';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkStorageService {
  private readonly authService = inject(AuthService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);

  private readonly _thesisWorksList = signal<ThesisWork[]>(this.initializeThesisWorks());

  public thesisWorks = computed(() => {
    const currentUser = this.authService.currentUser();
    const allWorks = this._thesisWorksList();
    if (!currentUser) return [];

    let filteredWorks: ThesisWork[] = [];

    if (this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DECANATURA,
      UserRoleType.CONSEJO
    ])) {
      filteredWorks = allWorks;
    } else {
      filteredWorks = allWorks.filter(work => this.canUserAccessThesisWork(work, currentUser.id));
    }

    // 👇 COMPORTAMIENTO DE PILA: Ordenamos de más reciente a más antiguo
    return [...filteredWorks].sort((a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  });

  constructor() {
    // Primer efecto: Sincroniza con LocalStorage
    effect(() => {
      localStorage.setItem('thesisWorks', JSON.stringify(this._thesisWorksList()));
    });

    // Segundo efecto: Escucha anteproyectos aprobados y crea/actualiza los Trabajos de Grado
    effect(() => {
      const approvedDrafts = this.preliminaryDraftService.preliminaryDrafts()
        .filter(draft => draft.state === stateList.APROBADO);

      this._thesisWorksList.update(currentWorks => {
        let hasChanges = false;
        const updatedWorks = [...currentWorks];

        approvedDrafts.forEach(draft => {
          const existingIndex = updatedWorks.findIndex(w => w.preliminaryDraftId === draft.preliminaryDraftId);

          // Dentro del segundo effect, en la sección de inserción:
          if (existingIndex === -1) {
            // 👇 Cambiamos .push() por .unshift() para insertarlo al inicio de la lista
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
              createdDate: new Date() // Este campo es el que usará el computed para ordenar
            });
            hasChanges = true;
          } else {
            // --- Lógica de Sincronización Añadida ---
            // Si ya existe, validamos si la fecha máxima de entrega cambió en el anteproyecto
            const currentDraftData = updatedWorks[existingIndex].preliminaryDraftData;

            if (currentDraftData.maximumDeliveryDate !== draft.maximumDeliveryDate) {
              updatedWorks[existingIndex] = {
                ...updatedWorks[existingIndex],
                preliminaryDraftData: draft // Reemplazamos con la versión actualizada que contiene la fecha
              };
              hasChanges = true;
            }
          }
        });

        return hasChanges ? updatedWorks : currentWorks;
      });
    });
  }

  /**
   * Muta el estado de un Trabajo de Grado específico de forma segura e inmutable.
   * Único punto de entrada para modificar los datos desde los sub-servicios.
   */
  public updateWork(id: string, mutator: (work: ThesisWork) => ThesisWork): void {
    this._thesisWorksList.update(list =>
      list.map(work => work.thesisWorkId === id ? mutator(work) : work)
    );
  }

  /**
   * Busca un trabajo de grado por ID y lo retorna como Observable.
   * Esto mantiene la compatibilidad asíncrona requerida por la Opción A (Fachada).
   */
  public getById(id: string): Observable<ThesisWork | undefined> {
    const work = this._thesisWorksList().find(w => w.thesisWorkId === id);
    return of(work).pipe(delay(500));
  }

  private initializeThesisWorks(): ThesisWork[] {
    const stored = localStorage.getItem('thesisWorks');
    return stored ? JSON.parse(stored) : [];
  }

  private canUserAccessThesisWork(work: ThesisWork, userId: string): boolean {
    const proposal = work.preliminaryDraftData.proposalData;
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
