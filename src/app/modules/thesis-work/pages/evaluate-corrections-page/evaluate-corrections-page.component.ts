import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { EvaluateCorrectionsFormComponent } from '../../components/evaluate-corrections-form/evaluate-corrections-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';

@Component({
  selector: 'app-evaluate-corrections-page',
  templateUrl: './evaluate-corrections-page.component.html',
  styleUrls: ['./evaluate-corrections-page.component.css'],
  standalone: true,
  imports: [EvaluateCorrectionsFormComponent, ConfirmationActionModalComponent]
})
export class EvaluateCorrectionsPageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  thesisWorkState = signal<ThesisWork | null>(null);
  isConfirmModalOpen = signal(false);
  isSubmitting = signal(false);
  pendingEvaluationData = signal<{ evaluation: Omit<Evaluation, 'id' | 'date'>, file: File } | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;

    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (id) {
      this.loadData(id);
    } else {
      this.notification.show({
        title: 'Error de navegación',
        message: 'No se pudo mapear la información técnica del trabajo de grado.',
        type: NotificationType.ERROR
      });
      this.goBack();
    }
  }

  private loadData(id: string): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data: ThesisWork | undefined) => {
        if (!data) {
          this.notification.show({ title: 'No encontrado', message: 'El proyecto de grado solicitado no existe en la base de datos.', type: NotificationType.INFO });
          this.goBack();
          return;
        }
        this.thesisWorkState.set(data);
      },
      error: () => {
        this.notification.show({ title: 'Fallo técnico', message: 'Error de red al intentar descargar los metadatos.', type: NotificationType.ERROR });
        this.goBack();
      }
    });
  }

  handleOpenConfirmation(event: { evaluation: Omit<Evaluation, 'id' | 'date'>, file: File }): void {
    this.pendingEvaluationData.set(event);
    this.isConfirmModalOpen.set(true);
  }

  executeEvaluationSave(): void {
    const data = this.pendingEvaluationData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;

    if (!data || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.thesisWorkService.evaluateCorrectedDocumentsMock(thesisId, data.evaluation, data.file).subscribe({
      next: () => {
        this.notification.show({
          title: 'Evaluación Oficial Registrada',
          message: 'El dictamen basado en el histórico de evaluaciones ha sido procesado de forma exitosa.',
          type: NotificationType.CONFIRMATION
        });
        this.isSubmitting.set(false);
        this.goBack();
      },
      error: () => {
        this.notification.show({
          title: 'Error al registrar',
          message: 'Ocurrió un problema de persistencia al guardar el dictamen del jurado.',
          type: NotificationType.ERROR
        });
        this.isSubmitting.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
