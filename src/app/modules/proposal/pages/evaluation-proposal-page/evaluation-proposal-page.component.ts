import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Proposal } from '../../interfaces/proposal.interface';
import { EvaluationProposalFacadeService, SaveProposalEvaluationEvent } from './services/evaluation-proposal-facade.service';
import { EvaluationProposalFormComponent } from '../../components/evaluation-proposal-form/evaluation-proposal-form.component';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';

@Component({
  selector: 'app-evaluation-proposal-page',
  standalone: true,
  imports: [EvaluationProposalFormComponent],
  templateUrl: './evaluation-proposal-page.component.html'
})
export class EvaluationProposalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  protected readonly facade = inject(EvaluationProposalFacadeService);

  readonly proposal = signal<Proposal | null>(null);
  /** Mientras se guarda la decisión no se envía otra */
  readonly isSubmitting = signal<boolean>(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
             ?? this.route.parent?.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }

    this.facade.load(
      id,
      (data) => this.proposal.set(data),
      () => this.goBack()
    );
  }

  downloadOriginalDocument(): void {
    const proposal = this.proposal();
    if (proposal) void this.facade.downloadOriginalDocument(proposal);
  }

  downloadAcceptanceLetter(): void {
    const proposal = this.proposal();
    if (proposal) void this.facade.downloadAcceptanceLetter(proposal);
  }

  handleSaveEvaluation(event: SaveProposalEvaluationEvent): void {
    const proposal = this.proposal();
    if (!proposal || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    void this.facade.saveEvaluation(event, proposal, this.route, () => this.isSubmitting.set(false));
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['../'], { relativeTo: this.route }));
  }
}
