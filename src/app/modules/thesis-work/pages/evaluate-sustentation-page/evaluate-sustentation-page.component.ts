import { Component, inject, OnInit, signal } from '@angular/core';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../core/enums/state.enum';
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { EvaluateSustentationFormComponent, SustentationEvaluationPayload } from "../../components/evaluate-sustentation-form/evaluate-sustentation-form.component";
import { ThesisWork } from '../../interfaces/thesis-work.interface'; // 👈 Importación necesaria

@Component({
  selector: 'app-evaluate-sustentation-page',
  templateUrl: './evaluate-sustentation-page.component.html',
  styleUrls: ['./evaluate-sustentation-page.component.css'],
  imports: [ConfirmationActionModalComponent, EvaluateSustentationFormComponent]
})
export class EvaluateSustentationPageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // 👈 Tipado estricto
  thesisWorkState = signal<ThesisWork | null>(null);
  isConfirmModalOpen = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // 👈 Estructura mapeada sin any
  pendingData = signal<{ payload: SustentationEvaluationPayload; file: File } | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;

    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (id) {
      this.loadThesisData(id);
    } else {
      this.goBack();
    }
  }

  private loadThesisData(id: string): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data: ThesisWork | undefined) => { // 👈 Soporte para undefined si el servicio falla internamente
        if (data) this.thesisWorkState.set(data);
      },
      error: () => {
        this.notification.show({
          title: 'Error de carga',
          message: 'No se pudo recuperar la información del proyecto.',
          type: NotificationType.ERROR
        });
        this.goBack();
      }
    });
  }

  // 👈 Firma reemplazada
  handleSaveTriggered(data: { payload: SustentationEvaluationPayload; file: File }): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processSustentationEvaluation(): void {
    const data = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;

    if (!data || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.thesisWorkService.registerSustentationVerdictMock(thesisId, data.payload, data.file).subscribe({
      next: () => {
        const decision = data.payload.veredict;
        let alertTitle = 'Sustentación Evaluada';
        let typeN = NotificationType.CONFIRMATION;

        if (decision === stateList.NO_APROBADO) {
          alertTitle = 'Sustentación No Aprobada';
          typeN = NotificationType.ERROR;
        } else if (decision === stateList.APLAZADO) {
          alertTitle = 'Sustentación Aplazada';
          typeN = NotificationType.INFO;
        }

        this.notification.show({
          title: alertTitle,
          message: `El veredicto de la sustentación ha sido registrado correctamente bajo el estado de [${decision}].`,
          type: typeN
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

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
