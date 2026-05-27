import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../users/services/user.service';
import { Proposal, Modality } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/models/user-role';
import { stateList } from '../../../core/enums/state.enum';
import { User } from '../../users/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ProposalStorageService {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  private readonly _proposalsList = signal<Proposal[]>(this.getStoredProposals());

  public proposals = computed(() => {
    const currentUser = this.authService.currentUser();
    const activeProposals = this._proposalsList().filter(p => p.isActive !== false);

    if (!currentUser) return [];

    if (this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR, UserRoleType.COMITE])) {
      return activeProposals;
    }

    return activeProposals.filter(proposal => {
      const isAuthor = proposal.authors?.some(author => author.id === currentUser.id);
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

  public getProposalsListSnapshot(): Proposal[] {
    return this._proposalsList();
  }

  public updateProposals(mutator: (list: Proposal[]) => Proposal[]): void {
    this._proposalsList.update(mutator);
  }

  public getById(id: string): Observable<Proposal | undefined> {
    const proposal = this._proposalsList().find(p => p.id === id);
    return of(proposal).pipe(delay(1000));
  }

  private getStoredProposals(): Proposal[] {
    const stored = localStorage.getItem('proposals');
    return stored ? JSON.parse(stored) : this.getInitialData();
  }

  private getMockUser(id: string): User {
    const user = this.userService.getAllUsers().find(u => u.id === id);
    if (!user) {
      throw new Error(`Usuario con ID ${id} no encontrado en los mocks.`);
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
      }
    ];
  }
}
