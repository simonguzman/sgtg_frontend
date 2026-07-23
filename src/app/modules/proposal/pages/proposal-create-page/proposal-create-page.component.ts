import { Component, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Proposal } from '../../interfaces/proposal.interface';
import { ProposalCreateFacadeService } from './services/proposal-create-facade.service';
import { ProposalFormComponent } from '../../components/proposal-form/proposal-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-proposal-create-page',
  standalone: true,
  imports: [ProposalFormComponent, ConfirmationActionModalComponent],
  templateUrl: './proposal-create-page.component.html',
  styleUrls: ['./proposal-create-page.component.css']
})
export class ProposalCreatePageComponent {
  private readonly location = inject(Location);
  protected readonly facade = inject(ProposalCreateFacadeService);

  readonly isModalOpen      = signal<boolean>(false);
  readonly pendingProposal  = signal<Proposal | null>(null);

  handleCreateProposal(proposalData: Proposal): void {
    if (!this.facade.validate(proposalData)) return;
    this.pendingProposal.set(proposalData);
    this.isModalOpen.set(true);
  }

  confirmCreation(): void {
    const proposal = this.pendingProposal();
    if (!proposal) return;
    this.isModalOpen.set(false);
    this.facade.save(
      proposal,
      () => this.pendingProposal.set(null),
      () => {}
    );
  }

  cancelCreation(): void {
    this.isModalOpen.set(false);
    this.pendingProposal.set(null);
  }

  goBack(): void {
    this.location.back();
  }
}
