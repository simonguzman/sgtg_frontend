import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Proposal } from '../../interfaces/proposal.interface';
import { ProposalCreateFacadeService } from './services/proposal-create-facade.service';
import { ProposalFormComponent } from '../../components/proposal-form/proposal-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';

@Component({
  selector: 'app-proposal-create-page',
  standalone: true,
  imports: [ProposalFormComponent, ConfirmationActionModalComponent],
  templateUrl: './proposal-create-page.component.html',
  styleUrls: ['./proposal-create-page.component.css']
})
export class ProposalCreatePageComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  protected readonly facade = inject(ProposalCreateFacadeService);

  readonly isModalOpen = signal<boolean>(false);
  readonly pendingProposal  = signal<Proposal | null>(null);
  /** Mientras se registra no se envía otra (se crearía dos veces) */
  readonly isSubmitting = signal<boolean>(false);

  handleCreateProposal(proposalData: Proposal): void {
    if (this.isSubmitting() || !this.facade.validate(proposalData)) return;
    this.pendingProposal.set(proposalData);
    this.isModalOpen.set(true);
  }

  confirmCreation(): void {
    const proposal = this.pendingProposal();
    if (!proposal || this.isSubmitting()) return;
    this.isModalOpen.set(false);
    this.isSubmitting.set(true);
    this.facade.save(
      proposal,
      () => { this.isSubmitting.set(false); this.pendingProposal.set(null); },
      () => this.isSubmitting.set(false)
    );
  }

  cancelCreation(): void {
    this.isModalOpen.set(false);
    this.pendingProposal.set(null);
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['/proposal']));
  }
}
