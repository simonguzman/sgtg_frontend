import { Component, inject, OnInit, signal } from '@angular/core';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import {  ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { EvaluateSpecialRequestFormComponent } from "../../components/evaluate-special-request-form/evaluate-special-request-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

@Component({
  selector: 'app-evaluate-special-request-page',
  templateUrl: './evaluate-special-request-page.component.html',
  styleUrls: ['./evaluate-special-request-page.component.css'],
  imports: [EvaluateSpecialRequestFormComponent, ConfirmationActionModalComponent]
})
export class EvaluateSpecialRequestPageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  thesisWorkState = signal<ThesisWork | null>(null);
  specialRequestState = signal<SpecialRequest | null>(null);
  isConfirmModalOpen = signal(false);
  isSubmitting = signal(false);
  pendingData = signal<{ status: any; resolutionDetails: string } | null>(null);

  ngOnInit() {
    const requestId = this.route.snapshot.paramMap.get('requestId');
    let thesisId = this.route.snapshot.paramMap.get('id');
    let currentRoute = this.route.parent;

    while (!thesisId && currentRoute) {
      thesisId = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (thesisId && requestId) {
      this.loadData(thesisId, requestId);
    } else {
      console.warn('Faltan parámetros en la URL:', { thesisId, requestId });
      this.goBack();
    }
  }

  private loadData(thesisId: string, reqId: string) {
    this.thesisWorkService.getThesisWorkByIdMock(thesisId).subscribe({
      next: (data) => {
        if (data) {
          this.thesisWorkState.set(data);
          const request = data.specialRequests?.find((req: SpecialRequest) => req.id === reqId);
          if (request) {
            this.specialRequestState.set(request);
          } else {
            this.showError('No se encontró la solicitud especial especificada.');
          }
        }
      },
      error: () => this.showError('No se pudo recuperar la información del proyecto.')
    });
  }

  private showError(message: string) {
    this.notification.show({
      title: 'Error de carga',
      message: message,
      type: NotificationType.ERROR
    });
    this.goBack();
  }

  handleSaveTriggered(data: { status: any; resolutionDetails: string }) {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processSpecialRequestEvaluation() {
    const data = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    const reqId = this.specialRequestState()?.id;

    if (!data || !thesisId || !reqId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.thesisWorkService.evaluateSpecialRequestMock(thesisId, reqId, data).subscribe({
      next: () => {
        this.notification.show({
          title: 'Evaluación Registrada',
          message: `La evaluación de la solicitud ha sido guardada correctamente.`,
          type: NotificationType.CONFIRMATION
        });

        this.isSubmitting.set(false);
        this.goBack();
      },
      error: () => {
        this.notification.show({
          title: 'Error de Red',
          message: 'Fallo la comunicación al almacenar la evaluación.',
          type: NotificationType.ERROR
        });
        this.isSubmitting.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
