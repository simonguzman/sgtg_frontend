import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Advance, ThesisWork } from '../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { EvaluateAdvanceFormComponent } from "../../components/evaluate-advance-form/evaluate-advance-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';

@Component({
  selector: 'app-evaluate-advance-page',
  templateUrl: './evaluate-advance-page.component.html',
  styleUrls: ['./evaluate-advance-page.component.css'],
  imports: [EvaluateAdvanceFormComponent, ConfirmationActionModalComponent]
})
export class EvaluateAdvancePageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  thesisWorkState = signal<ThesisWork | null>(null);
  advanceId = signal<string | null>(null);
  isConfirmModalOpen = signal(false);
  pendingReviewData = signal<SubmitAdvanceEvaluationPayload | null>(null);

  currentAdvance = computed<Advance | null>(() => {
    const work = this.thesisWorkState();
    const advId = this.advanceId();
    if (!work || !advId || !work.advances) return null;
    return work.advances.find(a => a.id === advId) || null;
  });

  ngOnInit() {
    let currentRoute: ActivatedRoute | null = this.route;
    let thesisId: string | null = null;
    while (currentRoute && !thesisId) {
      thesisId = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    const advId = this.route.snapshot.paramMap.get('advanceId');

    if (thesisId && advId) {
      this.advanceId.set(advId);
      this.loadThesisWorkData(thesisId);
    } else {
      this.notification.show({
        title: 'Error de navegación',
        message: 'No se pudieron identificar los parámetros del avance en la ruta.',
        type: NotificationType.ERROR
      });
    }
  }

  private loadThesisWorkData(id: string) {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data) => {
        if (!data) {
          this.notification.show({
            title: 'No encontrado',
            message: 'El trabajo de grado solicitado no existe.',
            type: NotificationType.INFO
          });
          return;
        }
        this.thesisWorkState.set(data);
      },
      error: () => this.notification.show({
        title: 'Error de conexión',
        message: 'No se pudo recuperar la información del proyecto.',
        type: NotificationType.ERROR
      })
    });
  }

  navigateBack() {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  handleRequestConfirmation(data: SubmitAdvanceEvaluationPayload) {
    this.pendingReviewData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processAdvanceEvaluation() {
    const data = this.pendingReviewData();
    const work = this.thesisWorkState();
    const advance = this.currentAdvance();
    const user = this.authService.currentUser();

    if (!data || !work || !advance || !user) return;

    const documentsNames: string[] = [];
    if (data.file) documentsNames.push(data.file.name);

    const isApproved = data.formValues.result === AdvanceEvaluationResult.EVALUADO;

    const evaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: work.preliminaryDraftData.proposalId,
      advanceId: advance.id,
      evaluatorId: user.id,
      evaluatorName: `${user.firstName} ${user.lastName}`,
      evaluatorRole: 'Docente / Evaluador',
      veredict: stateList.EVALUADO,
      observations: `[${data.formValues.result.toUpperCase()}] ${data.formValues.comments}`,
      signedDocuments: documentsNames,
      date: new Date()
    };

    this.thesisWorkService.addEvaluationMock(work.thesisWorkId, evaluation).subscribe({
      next: () => {
        this.notification.show({
          title: 'Evaluación Guardada',
          message: 'Los comentarios y el estado del avance han sido actualizados exitosamente.',
          type: NotificationType.CONFIRMATION
        });
        this.isConfirmModalOpen.set(false);
        this.navigateBack();
      },
      error: () => this.notification.show({
        title: 'Error al guardar',
        message: 'Ocurrió un error técnico al registrar la evaluación.',
        type: NotificationType.ERROR
      })
    });
  }

  downloadCurrentAdvance() {
    const advance = this.currentAdvance();
    const doc = advance?.documents?.[0];
    if (doc?.url) {
      this.downloadService.download(doc.url, doc.name);
    }
  }
}

