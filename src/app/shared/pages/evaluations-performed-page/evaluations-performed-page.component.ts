import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

// Models & Interfaces
import { NotificationType } from '../../components/notifications/models/notification.model';
import { FormattedDocument } from '../../../core/interfaces/formatted-document.interface';
import { EvaluationTableRow, EVALUATIONS_COLUMNS } from './models/evaluations-page.model';

// Services
import { FileDownloadService } from '../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../components/notifications/services/notification.service';
import { EvaluationsFacadeService } from './services/evaluations-facade.service';

// Components
import { TableComponent } from '../../components/table-component/table-component.component';
import { EvaluationModalComponent } from '../../components/modals/evaluation-modal/evaluation-modal.component';

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

  // Dependencias delegadas al Facade
  private readonly evaluationsFacade = inject(EvaluationsFacadeService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  private readonly params = toSignal(this.route.paramMap);
  private readonly parentParams = toSignal(this.route.parent?.paramMap || this.route.paramMap);

  private readonly contextId = computed(() =>
    this.params()?.get('id') || this.parentParams()?.get('id')
  );

  protected readonly columns = EVALUATIONS_COLUMNS;

  // El componente solo consulta al Facade de manera reactiva
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

  // ==========================================
  // ACCIONES DE LA INTERFAZ
  // ==========================================

  handleTableAction(event: { action: string; row: EvaluationTableRow }): void {
    if (event.action === 'view_details') {
      this.modalState.set({ open: true, evaluation: event.row });
    }
  }

  closeModal(): void {
    this.modalState.set({ open: false, evaluation: null });
  }

  handleDownload(document: FormattedDocument): void {
    if (!document.url) {
      this.showNotification('Error', 'No se pudo localizar el documento.', NotificationType.ERROR);
      return;
    }
    this.showNotification('Descarga', 'Iniciando descarga...', NotificationType.INFO);
    this.downloadService.download(document.url, document.name);
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
