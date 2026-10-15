import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { AnnulWorkModalComponent } from '../../../../shared/components/modals/annul-work-modal/annul-work-modal.component';
import { ProposalFacadeService } from './services/proposal-facade.service';
import { PROPOSAL_COLUMNS, ProposalTableRow } from './models/proposal-page.model';

@Component({
  selector: 'app-proposal-page',
  imports: [TableComponent, DescriptionModalComponent, AnnulWorkModalComponent],
  templateUrl: './proposal-page.component.html',
  styleUrl: './proposal-page.component.css',
})
export class ProposalPageComponent {
  private readonly router = inject(Router);
  protected readonly facade = inject(ProposalFacadeService);
  protected readonly columns = PROPOSAL_COLUMNS;
  protected readonly filterFields = ['title', 'modality', 'state', 'deadlineStatus', 'hiddenParticipants'];

  descriptionModal = { show: false, title: '', content: '' };
  annulState = { show: false, id: null as string | null, title: '', loading: false };

  handleTableAction(event: { action: string; row: ProposalTableRow }): void {
    if (!event.row.allowedActions.includes(event.action)) {
      this.facade.showRestrictedAccessNotification();
      return;
    }
    switch (event.action) {
      case 'ver descripcion':
        this.descriptionModal = { show: true, title: 'Descripción de la propuesta', content: event.row.description };
        break;
      case 'ver':
        this.router.navigate(['/proposal/details', event.row.id]);
        break;
      case 'editar':
        this.router.navigate(['/proposal/edit', event.row.id]);
        break;
      case 'anular':
        this.annulState = { show: true, id: event.row.id!, title: event.row.title, loading: false };
        break;
    }
  }

  handleHeaderButton(button: TableButton): void {
    switch (button.label) {
      case 'Registrar propuesta':
        this.router.navigate(['/proposal/create']);
        break;
      case 'Formatos descargables':
        this.router.navigate(['/proposal/downloadable_formats']);
        break;
    }
  }

  confirmAnnul(justification: string): void {
    const id = this.annulState.id;
    if (!id || this.annulState.loading) return;
    this.annulState.loading = true;
    this.facade.annulProposal(
      id,
      justification,
      () => { this.annulState = { show: false, id: null, title: '', loading: false }; },
      () => { this.annulState.loading = false; }
    );
  }

  cancelAnnul(): void {
    this.annulState = { show: false, id: null, title: '', loading: false };
  }
}
