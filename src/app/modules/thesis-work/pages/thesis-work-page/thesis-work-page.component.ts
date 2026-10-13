import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ThesisWorkPageFacadeService } from './services/thesis-work-page-facade.service';
import { THESIS_WORK_COLUMNS, ThesisWorkTableRow } from './models/thesis-work-page.model';

@Component({
  selector: 'app-thesis-work-page',
  standalone: true,
  imports: [TableComponent, DescriptionModalComponent],
  templateUrl: './thesis-work-page.component.html',
  styleUrl: './thesis-work-page.component.css',
})
export class ThesisWorkPageComponent {
  private readonly router = inject(Router);
  protected readonly facade = inject(ThesisWorkPageFacadeService);

  protected readonly columns = THESIS_WORK_COLUMNS;
  protected readonly filterFields = ['title', 'modality', 'state', 'maxDeliveryDate', 'hiddenParticipants'];

  readonly descriptionModal = signal({ show: false, title: '', content: '' });

  handleTableAction(event: { action: string; row: ThesisWorkTableRow }): void {
    if (!event.row.allowedActions.includes(event.action)) {
      this.facade.showRestrictedAccessNotification();
      return;
    }
    switch (event.action) {
      case 'ver descripción':
        this.descriptionModal.set({ show: true, title: 'Descripción del trabajo de grado', content: event.row.description });
        break;
      case 'ver':
        this.router.navigate(['/thesis-work/details', event.row.id]);
        break;
      case 'editar':
        this.router.navigate(['/thesis-work/edit', event.row.id]);
        break;
      case 'reactivar':
        // Reanudación: el director la registra con su documento como solicitud del trabajo
        this.router.navigate(['/thesis-work/details', event.row.id, 'register_special_request']);
        break;
    }
  }

  handleHeaderButton(button: TableButton): void {
    if (button.label === 'Formatos descargables') {
      this.router.navigate(['/thesis-work/downloadable_formats']);
    }
  }

}
