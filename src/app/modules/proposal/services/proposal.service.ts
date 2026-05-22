import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Modality, Proposal } from '../interfaces/proposal.interface';
import { delay, map, Observable, of, tap } from 'rxjs';
import { stateList } from '../../../core/enums/state.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Document } from '../../../core/interfaces/Document.interface';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/models/user-role';
import { UserService } from '../../users/services/user.service';
import { User } from '../../users/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ProposalService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly apiUrl = 'https://api-sgtg-placeholder.com/api/proposals';

  // Helper para obtener el objeto de usuario completo desde los datos de UserService
  private getMockUser(id: string): User {
    const user = this.userService.getAllUsers().find(u => u.id === id);
    if (!user) {
        throw new Error(`Usuario con ID ${id} no encontrado en los mocks.`);
    }
    return user;
  }

  // Datos iniciales refactorizados a Objetos Completos
  private readonly initialData: Proposal[] = [
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
      id: 'prop-003',
      title: 'Implementación de microservicios para gestión académica...',
      modality: Modality.PP,
      description: 'Migración de monolito a microservicios...',
      state: stateList.NO_APROBADO,
      authors: [this.getMockUser('user-456')],
      director: this.getMockUser('doc-005'),
      advisor: this.getMockUser('doc-002'),
      documents: [],
      evaluations: [],
      createdAt: new Date()
    },
    {
      id: 'prop-004',
      title: 'Estudio de algoritmos de optimización para transporte...',
      modality: Modality.TI,
      description: 'Optimización de rutas de buses...',
      state: stateList.APROBADO_CON_OBSERVACIONES,
      authors: [this.getMockUser('user-003')],
      director: this.getMockUser('doc-001'),
      codirector: this.getMockUser('doc-008'),
      documents: [],
      evaluations: [],
      createdAt: new Date()
    }
  ];

  private readonly _proposalsList = signal<Proposal[]>(this.getStoredProposals());

  public proposals = computed(() => {
    const currentUser = this.authService.currentUser();
    const activeProposals = this._proposalsList().filter(p => p.isActive !== false);

    if (!currentUser) return [];

    if (this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR, UserRoleType.COMITE])) {
      return activeProposals;
    }

    return activeProposals.filter(proposal => {
      const isAuthor = proposal.authors?.some( author => author.id === currentUser.id );
      const isDirector = proposal.director?.id === currentUser.id;
      const isCodirector = proposal.codirector?.id === currentUser.id;
      const isAdvisor = proposal.advisor?.id === currentUser.id;

      return isAuthor || isDirector || isCodirector || isAdvisor;
    });
  });

  constructor() {
    effect(() => {
      localStorage.setItem('proposals', JSON.stringify(this._proposalsList()));
    });
  }

  private getStoredProposals(): Proposal[] {
    const stored = localStorage.getItem('proposals');
    return stored ? JSON.parse(stored) : this.initialData;
  }

  createProposalMock(proposal: Proposal): Observable<Proposal> {
    const newProposal: Proposal = {
      ...proposal,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date(),
      state: stateList.EN_REVISION,
      documents: proposal.documents ? proposal.documents.map(doc => ({
        ...doc,
        id: doc.id || Date.now().toString()
      })) : [],
      evaluations: []
    };

    return of(newProposal).pipe(
      delay(1000),
      tap(onSaved => {
        this._proposalsList.update(current => [onSaved, ...current]);

        // Gestión de roles basada en objetos
        if (onSaved.director) this.userService.addRoleToUser(onSaved.director.id, UserRoleType.DIRECTOR);
        if (onSaved.codirector) this.userService.addRoleToUser(onSaved.codirector.id, UserRoleType.CODIRECTOR);
        if (onSaved.advisor) this.userService.addRoleToUser(onSaved.advisor.id, UserRoleType.ASESOR);
      })
    );
  }

  getProposalByIdMock(id: string): Observable<Proposal | undefined> {
    const proposal = this._proposalsList().find(p => p.id === id);
    return of(proposal).pipe(delay(1000));
  }

  validateProposalRules(proposal: Partial<Proposal>): string | null {
    // Regla: Director != Codirector (comparando IDs de objetos)
    if (proposal.director && proposal.codirector && proposal.director.id === proposal.codirector.id) {
      return 'Un docente no puede ser Director y Codirector simultáneamente.';
    }

    // Regla: Máximo 2 propuestas por estudiante
    if (proposal.authors && proposal.authors.length > 0) {
      for (const author of proposal.authors) {
        const activeCount = this._proposalsList().filter(p =>
          p.authors?.some(a => a.id === author.id) &&
          p.id !== proposal.id
        ).length;
        if (activeCount >= 2) {
          const studentName = this.userService.getUserFullName(author.id);
          return `El estudiante ${studentName} ya tiene 2 propuestas (límite máximo).`;
        }
      }
    }
    return null;
  }

  updateProposalMock(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    const oldProposal = this._proposalsList().find(p => p.id === id);

    return of(null).pipe(
      delay(1000),
      tap(() => {
        if (!oldProposal) return;

        this.handleRoleExchange(oldProposal.codirector?.id, changes.codirector?.id, UserRoleType.CODIRECTOR, id);
        this.handleRoleExchange(oldProposal.advisor?.id, changes.advisor?.id, UserRoleType.ASESOR, id);

        this._proposalsList.update(list =>
          list.map(p => (p.id === id ? { ...p, ...changes } : p))
        );
      }),
      map(() => this._proposalsList().find(p => p.id === id)!)
    );
  }

  private handleRoleExchange(
    oldId: string | undefined,
    newId: string | undefined,
    role: UserRoleType,
    currentProposalId: string
  ): void {
    if (oldId === newId) return;

    if (newId) this.userService.addRoleToUser(newId, role);

    if (oldId) {
      const isStillLinked = this._proposalsList().some(p =>
        p.id !== currentProposalId && (
          (role === UserRoleType.CODIRECTOR && p.codirector?.id === oldId) ||
          (role === UserRoleType.ASESOR && p.advisor?.id === oldId)
        )
      );

      if (!isStillLinked) {
        this.userService.removeRoleFromUser(oldId, role);
      }
    }
  }

  deleteProposalMock(id: string): Observable<void> {
    const proposalToRemove = this._proposalsList().find(p => p.id === id);

    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        if (!proposalToRemove) return;

        this._proposalsList.update(list => list.filter(p => p.id !== id));

        const rolesToCheck = [
          { id: proposalToRemove.codirector?.id, role: UserRoleType.CODIRECTOR },
          { id: proposalToRemove.advisor?.id, role: UserRoleType.ASESOR }
        ];

        rolesToCheck.forEach(({ id: userId, role }) => {
          if (userId) {
            const isStillLinked = this._proposalsList().some(p =>
              (role === UserRoleType.CODIRECTOR && p.codirector?.id === userId) ||
              (role === UserRoleType.ASESOR && p.advisor?.id === userId)
            );

            if (!isStillLinked) {
              this.userService.removeRoleFromUser(userId, role);
            }
          }
        });
      })
    );
  }

  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        this._proposalsList.update(list => list.map(p => {
          if (p.id === proposalId) {
            const updatedProposal = {
              ...p,
              state: evaluation.veredict,
              evaluations: [{ ...evaluation, id: Math.random().toString(36).substring(2, 7) }, ...(p.evaluations || [])]
            };

            if (updatedProposal.documents?.length > 0) {
              updatedProposal.documents = updatedProposal.documents.map((doc, index) =>
                index === 0 ? { ...doc, status: evaluation.veredict } : doc
              );
            }
            return updatedProposal;
          }
          return p;
        }));
      })
    );
  }

  uploadCorrectionMock(proposalId: string, newDoc: Document): Observable<void> {
    return of(undefined).pipe(
      delay(1200),
      tap(() => {
        this._proposalsList.update(list =>
          list.map(p => p.id === proposalId
            ? { ...p, documents: [newDoc, ...p.documents], state: stateList.EN_REVISION }
            : p
          )
        );
      })
    );
  }

  getDocumentsByProposalId(id: string): Document[] {
    const proposal = this._proposalsList().find(p => p.id === id);
    return proposal ? proposal.documents : [];
  }
}
