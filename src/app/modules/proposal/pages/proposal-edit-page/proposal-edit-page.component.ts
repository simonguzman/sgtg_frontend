import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { ProposalEditFacadeService } from './services/proposal-edit-facade.service';
import { Proposal } from '../../interfaces/proposal.interface';

import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { ProposalFormComponent } from "../../components/proposal-form/proposal-form.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-proposal-edit-page',
  standalone: true,
  imports: [ConfirmationActionModalComponent, ProposalFormComponent, InfoBannerComponent],
  templateUrl: './proposal-edit-page.component.html',
  styleUrls: ['./proposal-edit-page.component.css']
})
export class ProposalEditPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // 1. Inyectamos la verdadera fachada
  private readonly facade = inject(ProposalEditFacadeService);

  readonly proposalToEdit = signal<Proposal | null>(null);
  readonly isModalOpen    = signal<boolean>(false);
  readonly pendingData    = signal<Proposal | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.router.navigate(['/proposal']);
      return;
    }

    // 2. Delegamos la carga y autorización a la fachada
    this.facade.loadAndAuthorize(
      id,
      (proposal) => this.proposalToEdit.set(proposal),
      () => this.router.navigate(['/proposal']), // onForbidden
      () => this.router.navigate(['/proposal'])  // onNotFound
    );
  }

  handleUpdate(updatedData: Proposal): void {
    // 3. Delegamos la validación de reglas
    const errorMessage = this.facade.validateRules(updatedData);

    if (errorMessage) {
      this.facade.showValidationError(errorMessage);
      return;
    }

    this.pendingData.set(updatedData);
    this.isModalOpen.set(true);
  }

  confirmUpdate(): void {
    const currentProposal = this.proposalToEdit();
    const dataToSave = this.pendingData();

    if (!currentProposal?.id || !dataToSave) return;

    this.isModalOpen.set(false);

    // 4. Delegamos el guardado
    this.facade.saveUpdate(
      currentProposal.id,
      dataToSave,
      () => {
        this.pendingData.set(null);
        this.router.navigate(['/proposal']);
      },
      () => {
        // La notificación de error ya la maneja la fachada
        this.isModalOpen.set(false);
      }
    );
  }

  cancelUpdate(): void {
    this.isModalOpen.set(false);
    this.pendingData.set(null);
  }

  goBack(): void {
    this.location.back();
  }
}
