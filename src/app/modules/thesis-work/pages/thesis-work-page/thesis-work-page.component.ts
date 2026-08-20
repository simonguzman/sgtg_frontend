import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ThesisWorkPageFacadeService } from './services/thesis-work-page-facade.service';
import { THESIS_WORK_COLUMNS, ThesisWorkTableRow } from './models/thesis-work-page.model';

@Component({
  selector: 'app-thesis-work-page',
  standalone: true,
  imports: [TableComponent, DescriptionModalComponent, ConfirmationActionModalComponent],
  templateUrl: './thesis-work-page.component.html',
  styleUrl: './thesis-work-page.component.css',
})
export class ThesisWorkPageComponent {
  private readonly router = inject(Router);
  protected readonly facade = inject(ThesisWorkPageFacadeService);

  protected readonly columns = THESIS_WORK_COLUMNS;
  protected readonly filterFields = ['title', 'modality', 'state', 'maxDeliveryDate', 'hiddenParticipants'];

  // ← Fix: de objetos planos mutables a signal(), mismo patrón aplicado
  // en ProposalPageComponent hace varios turnos.
  readonly descriptionModal = signal({ show: false, title: '', content: '' });
  readonly reactivateState  = signal({ show: false, id: null as string | null, loading: false });

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
        this.reactivateState.set({ show: true, id: event.row.id, loading: false });
        break;
    }
  }

  handleHeaderButton(button: TableButton): void {
    if (button.label === 'Formatos descargables') {
      this.router.navigate(['/thesis-work/downloadable_formats']);
    }
  }

  confirmReactivation(): void {
    const { id, loading } = this.reactivateState();
    if (!id || loading) return;

    this.reactivateState.update(s => ({ ...s, loading: true }));

    this.facade.reactivateThesis(
      id,
      () => this.reactivateState.set({ show: false, id: null, loading: false }),
      () => this.reactivateState.update(s => ({ ...s, loading: false }))
    );
  }

  cancelReactivation(): void {
    this.reactivateState.set({ show: false, id: null, loading: false });
  }
}
