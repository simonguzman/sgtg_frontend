import { inject, Injectable } from '@angular/core';
import { ProposalStorageService } from './proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class ProposalRulesService {
  private readonly storage = inject(ProposalStorageService);
  private readonly userService = inject(UserService);

  /**
   * Valida restricciones del negocio: Coherencia de roles y máximos por estudiante.
   */
  validateProposalRules(proposal: Partial<Proposal>): string | null {
    if (proposal.director && proposal.codirector && proposal.director.id === proposal.codirector.id) {
      return 'Un docente no puede ser Director y Codirector simultáneamente.';
    }

    if (proposal.authors && proposal.authors.length > 0) {
      for (const author of proposal.authors) {
        const activeCount = this.storage.getProposalsListSnapshot().filter(p =>
          p.authors?.some(a => a.id === author.id) && p.id !== proposal.id
        ).length;

        if (activeCount >= 2) {
          const studentName = this.userService.getUserFullName(author.id);
          return `El estudiante ${studentName} ya tiene 2 propuestas (límite máximo).`;
        }
      }
    }
    return null;
  }

  /**
   * Controla el ciclo de vida de los roles asignados a los docentes cuando se edita o reemplaza personal.
   */
  handleRoleExchange(
    oldId: string | undefined,
    newId: string | undefined,
    role: UserRoleType,
    currentProposalId: string
  ): void {
    if (oldId === newId) return;

    if (newId) this.userService.addRoleToUser(newId, role);

    if (oldId) {
      const isStillLinked = this.storage.getProposalsListSnapshot().some(p =>
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
}
