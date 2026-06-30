import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/models/user-role';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryDraftStorageService {
  private readonly authService = inject(AuthService);
  private readonly _preliminaryDraftsList = signal<PreliminaryDraft[]>(this.getStoredPreliminaryDrafts());

  public allPreliminaryDrafts = this._preliminaryDraftsList.asReadonly();

  /**
   * Señal computada reactiva que expone las propuestas activas filtradas por el rol
   * y los privilegios de participación del usuario autenticado.
   */
  public preliminaryDrafts = computed(() => {
    const currentUser = this.authService.currentUser();
    const activePreliminaryDrafts = this._preliminaryDraftsList().filter(preliminaryDraft => !preliminaryDraft.isArchived);
    if (!currentUser) return [];

    if (this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.COMITE,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ])) {
      return activePreliminaryDrafts;
    }

    return activePreliminaryDrafts.filter(preliminaryDraft =>
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
    if (stored && stored !== '[]') {
      return JSON.parse(stored);
    }

    // --- MOCKS PARA TESTING FRONTEND ---
    // Si el localStorage está vacío, inyectamos estos datos de prueba.
    const mockData: PreliminaryDraft[] = [
      {
        preliminaryDraftId: 'PD-1001',
        proposalId: 'PROP-1001',
        isArchived: false,
        state: stateList.EN_REVISION, // ✨ CORREGIDO
        createdData: new Date(),
        evaluationDeadline: new Date(new Date().setDate(new Date().getDate() + 7)),
        maximumDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 15)),
        evaluators: [],
        evaluations: [],
        documents: [
          { id: 'doc-1', name: 'Documento_Anteproyecto_v1', url: '#', type: 'PDF' } as any
        ],
        proposalData: {
          id: 'PROP-1001',
          title: 'Sistema de Gestión de Usuarios con Arquitectura Frontend en Angular',
          description: 'Implementación del epic HE-01 bajo metodología Scrumban, priorizando maquetación y testing de componentes.',
          modality: 'Trabajo de investigación' as any,
          authors: [
            // Recuerda poner aquí tu ID real del mock de usuarios
            { id: 'user-simon-1', firstName: 'Simon', lastName: 'Guzmán Anaya', email: 'simon@test.com' } as any
          ],
          director: { id: 'dir-1', firstName: 'Carlos', lastName: 'Ramirez' } as any,
          state: stateList.APROBADO, // ✨ CORREGIDO
          createdAt: new Date(),
          documents: [],
          evaluations: [],
          isArchived: false
        }
      },
      {
        preliminaryDraftId: 'PD-1002',
        proposalId: 'PROP-1002',
        isArchived: false,
        state: stateList.EN_REVISION, // ✨ CORREGIDO
        createdData: new Date(),
        evaluationDeadline: new Date(),
        maximumDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        evaluators: [
          { id: 'user-simon-1', firstName: 'Simon', lastName: 'Guzmán Anaya' } as any
        ],
        evaluations: [],
        documents: [],
        proposalData: {
          id: 'PROP-1002',
          title: 'Optimización de Renderizado con Signals',
          description: 'Estudio de rendimiento en tablas de datos grandes usando la nueva API de Angular.',
          modality: 'Trabajo de investigación' as any,
          authors: [{ id: 'student-2', firstName: 'Ana', lastName: 'Lopez' } as any],
          director: { id: 'dir-2', firstName: 'Luis', lastName: 'Martinez' } as any,
          state: stateList.APROBADO, // ✨ CORREGIDO
          createdAt: new Date(),
          documents: [],
          evaluations: [],
          isArchived: false
        }
      },
      {
        preliminaryDraftId: 'PD-1003',
        proposalId: 'PROP-1003',
        isArchived: true,
        state: stateList.APROBADO, // ✨ CORREGIDO
        createdData: new Date('2025-08-10'),
        evaluationDeadline: new Date('2025-08-20'),
        maximumDeliveryDate: new Date('2025-09-01'),
        evaluators: [],
        evaluations: [{ id: 'eval-doc-1', comments: 'Excelente maquetación de la propuesta.', state: stateList.APROBADO } as any],
        documents: [],
        proposalData: {
          id: 'PROP-1003',
          title: 'Migración de Sistema Legacy a Arquitectura Serverless',
          description: 'Propuesta archivada de semestres anteriores.',
          modality: 'Practica profesional' as any,
          authors: [{ id: 'user-simon-1', firstName: 'Simon', lastName: 'Guzmán Anaya' } as any],
          director: { id: 'dir-3', firstName: 'Marta', lastName: 'Gomez' } as any,
          state: stateList.APROBADO, // ✨ CORREGIDO
          createdAt: new Date('2025-07-01'),
          documents: [],
          evaluations: [],
          isArchived: true
        }
      }
    ];

    return mockData;
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
