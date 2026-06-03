import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { UserRoleType } from '../../../core/models/user-role';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays } from '../../../core/utils/date-utils';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryDraftAssignmentService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly userService = inject(UserService);

  /**
   * Valida que los evaluadores propuestos cumplan con las restricciones normativas de la institución.
   */
  validateReviewersRules(originalProposal: Proposal, evaluator1Id: string, evaluator2Id: string): string | null {
    if (evaluator1Id === evaluator2Id) {
      return 'Debe seleccionar dos evaluadores diferentes.';
    }
    if (!originalProposal) {
      return 'No se proporcionaron los datos de la propuesta.';
    }

    const forbiddenIds = new Set<string>();
    if (originalProposal.director?.id) forbiddenIds.add(originalProposal.director.id);
    if (originalProposal.codirector?.id) forbiddenIds.add(originalProposal.codirector.id);
    if (originalProposal.advisor?.id) forbiddenIds.add(originalProposal.advisor.id);

    originalProposal.authors?.forEach(author => {
      if (typeof author === 'string') {
        forbiddenIds.add(author);
      } else if ((author as any)?.id) {
        forbiddenIds.add((author as any).id);
      }
    });

    if (forbiddenIds.has(evaluator1Id)) return 'El primer docente tiene vínculos con la propuesta.';
    if (forbiddenIds.has(evaluator2Id)) return 'El segundo docente tiene vínculos con la propuesta.';

    return null;
  }

  /**
   * Asigna evaluadores a un anteproyecto y actualiza sus roles en el sistema.
   */
  assignReviewersMock(preliminaryDraftId: string, evaluatorsIds: string[]): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        evaluatorsIds.forEach(id => {
          this.userService.addRoleToUser(id, UserRoleType.EVALUADOR);
        });

        const evaluatorUsers = evaluatorsIds
          .map(id => this.userService.users().find(user => user.id === id))
          .filter((user): user is User => !!user);

        const deadline = addBusinessDays(new Date(), 10);

        this.storage.updateDraft(preliminaryDraftId, (draft) => ({
          ...draft,
          evaluators: evaluatorUsers,
          state: stateList.EN_REVISION,
          evaluationDeadline: deadline
        }));
      })
    );
  }
}
