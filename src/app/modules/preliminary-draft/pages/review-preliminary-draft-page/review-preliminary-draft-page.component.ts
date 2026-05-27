import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { ReviewPreliminaryDraftFormComponent } from "../../components/review-preliminary-draft-form/review-preliminary-draft-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
@Component({
  selector: 'app-review-preliminary-draft-page',
  templateUrl: './review-preliminary-draft-page.component.html',
  styleUrls: ['./review-preliminary-draft-page.component.css'],
  imports: [ReviewPreliminaryDraftFormComponent, ConfirmationActionModalComponent]
})
export class ReviewPreliminaryDraftPageComponent implements OnInit {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  preliminaryDraftState = signal<PreliminaryDraft | null>(null);
  isConfirmModalOpen = signal(false);
  pendingReviewData = signal<{ formValues: any, file: File, annotatedFile?: File } | null>(null);

  readonly activeRevision = computed(() => {
    const PreliminaryDraft = this.preliminaryDraftState();
    if (!PreliminaryDraft?.documents) return null;
    return [...PreliminaryDraft.documents]
      .filter(document => document.type === 'Anteproyecto' || document.type === 'Correccion')
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())[0];
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? this.route.parent?.snapshot.paramMap.get('id');
    if (id) {
      this.loadData(id);
    } else {
      this.showNavigationErrorNotification();
    }
  }

  private loadData(id: string) {
    this.preliminaryDraftService.getPreliminaryDraftByIdMock(id).subscribe({
      next: (data) => {
        if (!data) {
          this.showNotFoundNotification();
          return;
        }

        const isEvaluator = data.evaluators?.some(e => e.id === this.authService.currentUser()?.id);
        if (!isEvaluator) {
          this.showAccessDeniedNotification();
          this.router.navigate(['/dashboard']);
          return;
        }
        this.preliminaryDraftState.set(data);
      },
      error: () => this.showConnectionErrorNotification()
    });
  }

  handleRequestConfirmation(data: { formValues: any, file: File, annotatedFile?: File }) {
    this.pendingReviewData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processEvaluation() {
    const data = this.pendingReviewData();
    const PreliminaryDraft = this.preliminaryDraftState();
    const user = this.authService.currentUser();
    const revision = this.activeRevision();

    if (!data || !PreliminaryDraft?.preliminaryDraftId || !user || !revision) {
      this.showValidationErrorNotification();
      return;
    }

    const documentsNames = [data.file.name];
    if (data.annotatedFile) documentsNames.push(data.annotatedFile.name);

    const isApproved = data.formValues.result === 'Aprobado';

    const evaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: PreliminaryDraft.proposalId,
      documentId: revision.id,
      evaluatorId: user.id,
      evaluatorName: `${user.firstName} ${user.lastName}`,
      evaluatorRole: 'Evaluador',
      veredict: isApproved ? stateList.APROBADO : stateList.NO_APROBADO,
      observations: data.formValues.comments,
      signedDocuments: documentsNames,
      date: new Date()
    };

    this.preliminaryDraftService.addEvaluationMock(PreliminaryDraft.preliminaryDraftId, evaluation).subscribe({
      next: () => {
        this.showEvaluationSuccessNotification(isApproved);
        this.isConfirmModalOpen.set(false);
        this.router.navigate(['../../'], { relativeTo: this.route });
      },
      error: () => this.showSaveErrorNotification()
    });
  }

  downloadCurrentDocument() {
    const rev = this.activeRevision();
    if (rev) {
      this.downloadService.download(rev.url, rev.name);
    } else {
      this.showDownloadErrorNotification();
    }
  }

  private showEvaluationSuccessNotification(isApproved: boolean) {
    this.notification.show({
      title: 'Evaluación Registrada',
      message: isApproved
        ? 'El veredicto positivo ha sido guardado exitosamente.'
        : 'Se ha registrado el veredicto negativo y se solicitarán correcciones.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showAccessDeniedNotification() {
    this.notification.show({
      title: 'Acceso Denegado',
      message: 'Usted no cuenta con permisos de evaluador asignados para este proyecto.',
      type: NotificationType.ERROR
    });
  }

  private showNavigationErrorNotification() {
    this.notification.show({
      title: 'Error de navegación',
      message: 'No se pudo identificar el ID del anteproyecto en la ruta.',
      type: NotificationType.ERROR
    });
  }

  private showNotFoundNotification() {
    this.notification.show({
      title: 'No encontrado',
      message: 'El anteproyecto solicitado no existe en nuestros registros.',
      type: NotificationType.INFO
    });
  }

  private showConnectionErrorNotification() {
    this.notification.show({
      title: 'Error de conexión',
      message: 'No se pudo obtener la información del anteproyecto desde el servidor.',
      type: NotificationType.ERROR
    });
  }

  private showValidationErrorNotification() {
    this.notification.show({
      title: 'Datos incompletos',
      message: 'No se pudo procesar la evaluación debido a que falta información del usuario o del documento.',
      type: NotificationType.ERROR
    });
  }

  private showSaveErrorNotification() {
    this.notification.show({
      title: 'Error al guardar',
      message: 'Ocurrió un error técnico al intentar registrar su evaluación. Intente de nuevo.',
      type: NotificationType.ERROR
    });
  }

  private showDownloadErrorNotification() {
    this.notification.show({
      title: 'Error de descarga',
      message: 'No se encontró un archivo válido para descargar en la revisión actual.',
      type: NotificationType.INFO
    });
  }
}
