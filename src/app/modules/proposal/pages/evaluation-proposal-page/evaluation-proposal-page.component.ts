import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Proposal } from '../../interfaces/proposal.interface';
import { EvaluationProposalFacadeService } from './services/evaluation-proposal-facade.service';
import { EvaluationProposalFormComponent } from '../../components/evaluation-proposal-form/evaluation-proposal-form.component';

@Component({
  selector: 'app-evaluation-proposal-page',
  standalone: true,
  imports: [EvaluationProposalFormComponent],
  templateUrl: './evaluation-proposal-page.component.html'
})
export class EvaluationProposalPageComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly location = inject(Location);
  protected readonly facade = inject(EvaluationProposalFacadeService);

  readonly proposal = signal<Proposal | null>(null);

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
    if (proposal) this.facade.downloadOriginalDocument(proposal);
  }

  handleSaveEvaluation(event: { result: string; comments: string; signedFileName: string }): void {
    const proposal = this.proposal();
    if (!proposal) return;
    this.facade.saveEvaluation(event, proposal, this.route, () => {});
  }

  goBack(): void {
    this.location.back();
  }
}
