import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { PreliminaryDraftFacadeService } from './services/preliminary-draft-facade.service';
import { PRELIMINARY_DRAFT_COLUMNS, PreliminaryDraftTableRow } from './models/preliminary-draft-page.model';

@Component({
  selector: 'app-preliminary-draft-page',
  standalone: true,
  imports: [TableComponent, DescriptionModalComponent, ConfirmationActionModalComponent],
  templateUrl: './preliminary-draft-page.component.html',
  styleUrl: './preliminary-draft-page.component.css',
})
export class PreliminaryDraftPageComponent {
  private readonly router = inject(Router);
  protected readonly facade = inject(PreliminaryDraftFacadeService);

  protected readonly columns = PRELIMINARY_DRAFT_COLUMNS;
  protected readonly filterFields = ['title', 'modality', 'state', 'remainingTime', 'hiddenParticipants'];

  descriptionModal = { show: false, title: '', content: '' };
  deleteState = { show: false, id: null as string | null, title: '', loading: false };

  handleTableAction(event: { action: string; row: PreliminaryDraftTableRow }): void {
    if (!event.row.allowedActions.includes(event.action)) {
      this.facade.showRestrictedAccessNotification();
      return;
    }

    switch (event.action) {
      case 'ver descripción':
        this.descriptionModal = { show: true, title: 'Descripción del anteproyecto', content: event.row.description };
        break;
      case 'ver':
        this.router.navigate(['/preliminary-draft/details', event.row.id]);
        break;
      case 'editar':
        this.router.navigate(['/preliminary-draft/edit', event.row.id]);
        break;
      case 'eliminar':
        this.deleteState = { show: true, id: event.row.id, title: event.row.title, loading: false };
        break;
    }
  }

  handleHeaderButton(button: TableButton): void {
    switch (button.label) {
      case 'Registrar anteproyecto':
        this.router.navigate(['/preliminary-draft/create']);
        break;
      case 'Formatos descargables':
        this.router.navigate(['/preliminary-draft/downloadable_formats']);
        break;
    }
  }

  confirmDelete(): void {
    const id = this.deleteState.id;
    if (!id || this.deleteState.loading) return;

    this.deleteState.loading = true;
    this.facade.deleteDraft(
      id,
      () => { this.deleteState = { show: false, id: null, title: '', loading: false }; },
      () => { this.deleteState.loading = false; }
    );
  }

  cancelDelete(): void {
    this.deleteState = { show: false, id: null, title: '', loading: false };
  }
}
