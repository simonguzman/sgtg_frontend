import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { UserService } from '../../users/services/user.service';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { Proposal } from '../../proposal/interfaces/proposal.interface';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftAssignmentService {
  private readonly userService = inject(UserService);
  private readonly api         = inject(TrabajoGradoApiService);
  private readonly store       = inject(TrabajoGradoStoreService);

  public validateReviewersRules(
    originalProposal: Proposal,
    evaluator1Id: string,
    evaluator2Id: string
  ): string | null {
    if (evaluator1Id === evaluator2Id) {
      return 'Debe seleccionar dos evaluadores diferentes.';
    }
    if (!originalProposal) {
      return 'No se proporcionaron los datos de la propuesta.';
    }

    const forbiddenIds = new Set<string>();
    if (originalProposal.director?.id)   forbiddenIds.add(originalProposal.director.id);
    if (originalProposal.codirector?.id) forbiddenIds.add(originalProposal.codirector.id);
    if (originalProposal.advisor?.id)    forbiddenIds.add(originalProposal.advisor.id);

    originalProposal.authors?.forEach(author => {
      const id = typeof author === 'string' ? author : author?.id;
      if (id) forbiddenIds.add(id);
    });

    if (forbiddenIds.has(evaluator1Id)) return 'El primer docente tiene vínculos con la propuesta.';
    if (forbiddenIds.has(evaluator2Id)) return 'El segundo docente tiene vínculos con la propuesta.';
    return null;
  }

  /**
   * Asigna los dos evaluadores (`POST /{id}/anteproyecto/evaluadores`). El
   * backend valida el departamento del jefe, les agrega el rol EVALUADOR y el
   * trabajo pasa a evaluación con el plazo de 10 días hábiles.
   */
  public assignReviewers(
    preliminaryDraftId: string,
    evaluatorsIds: string[]
  ): Observable<void> {
    const [evaluador1Id, evaluador2Id] = evaluatorsIds.map(id => Number(id));
    return this.api.enviarJson(preliminaryDraftId, 'anteproyecto/evaluadores', { evaluador1Id, evaluador2Id }).pipe(
      tap(trabajo => {
        this.store.upsert(trabajo);
        // Los evaluadores ganaron el rol EVALUADOR: se refresca la lista de usuarios
        this.userService.loadUsers();
      }),
      map(() => undefined)
    );
  }
}
