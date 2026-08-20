import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationType } from '../../components/notifications/models/notification.model';
import { FormattedDocument } from '../../../core/interfaces/formatted-document.interface';
import { EvaluationTableRow, EVALUATIONS_COLUMNS } from './models/evaluations-page.model';
import { NotificationService } from '../../components/notifications/services/notification.service';
import { EvaluationsFacadeService } from './services/evaluations-facade.service';
import { TableComponent } from '../../components/table-component/table-component.component';
import { EvaluationModalComponent } from '../../components/modals/evaluation-modal/evaluation-modal.component';
// ← FileDownloadService eliminado: la descarga ahora vive por completo
// en el facade, mismo patrón que el resto de páginas del proyecto.

@Component({
  selector: 'app-evaluations-performed-page',
  standalone: true,
  imports: [TableComponent, EvaluationModalComponent],
  templateUrl: './evaluations-performed-page.component.html',
  styleUrls: ['./evaluations-performed-page.component.css']
})
export class EvaluationsPerformedPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly evaluationsFacade = inject(EvaluationsFacadeService);
  private readonly notificationService = inject(NotificationService);

  private readonly params = toSignal(this.route.paramMap);
  private readonly parentParams = toSignal(this.route.parent?.paramMap || this.route.paramMap);
  private readonly contextId = computed(() =>
    this.params()?.get('id') || this.parentParams()?.get('id')
  );

  protected readonly columns = EVALUATIONS_COLUMNS;

  protected evaluationsWithPermissions = computed<EvaluationTableRow[]>(() => {
    const id = this.contextId();
    if (!id) return [];
    return this.evaluationsFacade.getMappedEvaluations(id, this.router.url);
  });

  modalState = signal<{ open: boolean; evaluation: EvaluationTableRow | null }>({
    open: false, evaluation: null
  });

  ngOnInit(): void {
    if (!this.contextId()) {
      this.handleError('No se pudo identificar el registro.');
    }
  }

  handleTableAction(event: { action: string; row: EvaluationTableRow }): void {
    if (event.action === 'view_details') {
      this.modalState.set({ open: true, evaluation: event.row });
    }
  }

  closeModal(): void {
    this.modalState.set({ open: false, evaluation: null });
  }

  // ← Simplificado: solo delega. void marca explícitamente que no se
  // espera el resultado — el facade ya maneja éxito/error con sus
  // propias notificaciones.
  handleDownload(document: FormattedDocument): void {
    void this.evaluationsFacade.handleDownload(document);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }

  private handleError(message: string): void {
    this.showNotification('Atención', message, NotificationType.ERROR);
    this.router.navigate(['/']);
  }
}
