import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { AnnulWorkModalComponent } from '../../../../shared/components/modals/annul-work-modal/annul-work-modal.component';
import { PreliminaryDraftFacadeService } from './services/preliminary-draft-facade.service';
import { PRELIMINARY_DRAFT_COLUMNS, PreliminaryDraftTableRow } from './models/preliminary-draft-page.model';

@Component({
  selector: 'app-preliminary-draft-page',
  standalone: true,
  imports: [TableComponent, DescriptionModalComponent, AnnulWorkModalComponent],
  templateUrl: './preliminary-draft-page.component.html',
  styleUrl: './preliminary-draft-page.component.css',
})
export class PreliminaryDraftPageComponent {
  private readonly router = inject(Router);
  protected readonly facade = inject(PreliminaryDraftFacadeService);

  protected readonly columns = PRELIMINARY_DRAFT_COLUMNS;
  protected readonly filterFields = ['title', 'modality', 'state', 'remainingTime', 'hiddenParticipants'];

  descriptionModal = { show: false, title: '', content: '' };
  annulState = { show: false, id: null as string | null, title: '', loading: false };

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
      case 'anular':
        this.annulState = { show: true, id: event.row.id, title: event.row.title, loading: false };
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

  confirmAnnul(justification: string): void {
    const id = this.annulState.id;
    if (!id || this.annulState.loading) return;
    this.annulState.loading = true;
    this.facade.annulDraft(
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
