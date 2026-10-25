import { Component, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ARCHIVED_WORK_ACTIONS, ARCHIVED_WORK_ROUTES, ArchivedWorksService } from './services/archived-works.service';

/** Historial: trabajos de grado archivados (terminados, no aprobados, cancelados o anulados). */
@Component({
  selector: 'app-history-page',
  templateUrl: './history-page.component.html',
  styleUrls: ['./history-page.component.css'],
  imports: [TableComponent, DescriptionModalComponent]
})
export class HistoryPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly archivedWorks = inject(ArchivedWorksService);

  readonly columns = this.archivedWorks.columns;
  readonly tableData = this.archivedWorks.tableData;
  readonly descriptionModal = signal({ show: false, title: '', content: '' });

  /** Qué trabajos ve el usuario: todos (acceso general) o aquellos en los que participó. */
  readonly alcance = computed(() => this.archivedWorks.accesoGeneral()
    ? 'Ves todos los trabajos de grado archivados.'
    : 'Ves los trabajos en los que participaste como estudiante, director, codirector o asesor.');

  readonly emptyMessage = computed(() => this.archivedWorks.accesoGeneral()
    ? 'Aún no hay trabajos de grado archivados. Aparecerán aquí cuando un trabajo finalice, no se apruebe, se cancele o se anule.'
    : 'Aún no tienes trabajos de grado archivados. Aparecerán aquí los trabajos en los que participaste cuando finalicen, no se aprueben, se cancelen o se anulen.');

  handleTableAction(event: { action: string; row: Record<string, unknown> }): void {
    const rowId = event.row['id'] as string;

    if (event.action === ARCHIVED_WORK_ACTIONS.DESCRIPCION) {
      const justification = event.row['justification'] as string | null;
      const description = (event.row['description'] as string) || 'No hay descripción disponible para este registro.';
      this.descriptionModal.set({
        show: true,
        title: event.row['title'] as string,
        content: justification ? `${description}\n\nObservaciones: ${justification}` : description
      });
      return;
    }

    const routeSegment = ARCHIVED_WORK_ROUTES[event.action];
    if (routeSegment) {
      this.router.navigate([routeSegment, rowId], { relativeTo: this.route });
    } else {
      console.warn(`Acción no manejada en historial: ${event.action}`);
    }
  }
}
