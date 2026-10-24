import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Proposal } from '../../interfaces/proposal.interface';
import { ProposalDetailsFacadeService } from './services/proposal-details-facade.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { WorkDetailsComponent } from '../../../../shared/components/work-details/work-details.component';
import { WorkDetailsView } from '../../../../shared/components/work-details/work-details.model';

@Component({
  selector: 'app-proposal-details-page',
  imports: [ButtonComponent, WorkDetailsComponent],
  templateUrl: './proposal-details-page.component.html',
  styleUrls: ['./proposal-details-page.component.css']
})
export class ProposalDetailsPageComponent implements OnInit {
  protected readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(ProposalDetailsFacadeService);

  readonly proposal = signal<Proposal | null>(null);
  readonly view = computed<WorkDetailsView | null>(() => {
    const proposal = this.proposal();
    return proposal ? this.facade.buildView(proposal) : null;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
             ?? this.route.parent?.snapshot.paramMap.get('id');

    if (!id) {
      this.facade.handleMissingId(() => this.facade.goBack());
      return;
    }

    this.facade.load(
      id,
      (data) => this.proposal.set(data),
      () => this.facade.goBack(),
      () => this.facade.goBack()
    );
  }

  navigateToEvaluations(): void {
    this.router.navigate(['evaluations_performed'], { relativeTo: this.route });
  }

  navigateToLoadedProposals(): void {
    this.router.navigate(['loaded_proposals'], { relativeTo: this.route });
  }
}
