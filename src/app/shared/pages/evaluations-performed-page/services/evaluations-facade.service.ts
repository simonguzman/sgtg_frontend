import { Injectable, inject } from '@angular/core';
import { EvaluationsMapperService } from './evaluations-mapper.service';
import { ProposalService } from '../../../../modules/proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../../modules/preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../../modules/thesis-work/services/thesis-work.service';
import { EvaluationTableRow } from '../models/evaluations-page.model';
import { ThesisWork } from '../../../../modules/thesis-work/interfaces/thesis-work.interface';

@Injectable({ providedIn: 'root' })
export class EvaluationsFacadeService {
  private readonly mapper = inject(EvaluationsMapperService);
  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);

  public getMappedEvaluations(id: string, currentUrl: string): EvaluationTableRow[] {
    let mappedEvaluations: EvaluationTableRow[] = [];

    if (currentUrl.includes('proposal')) {
      const proposal = this.proposalService.allProposals().find(proposal => proposal.id === id);
      mappedEvaluations = this.mapper.processProposalEvaluations(proposal);
    } else if (currentUrl.includes('preliminary-draft')) {
      const preliminaryDraft = this.preliminaryDraftService.allPreliminaryDrafts().find(preliminaryDraft => preliminaryDraft.preliminaryDraftId === id);
      mappedEvaluations = this.mapper.processDraftEvaluations(preliminaryDraft);
    } else if (currentUrl.includes('thesis')) {
      const thesis = this.thesisWorkService.allThesisWorks().find((t: ThesisWork) => t.thesisWorkId === id);
      if (thesis) {
        mappedEvaluations = this.mapper.processThesisEvaluations(thesis);
      }
    }

    return mappedEvaluations.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}
