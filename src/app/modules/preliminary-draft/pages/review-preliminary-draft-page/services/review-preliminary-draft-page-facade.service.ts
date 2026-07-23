import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';

import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

export interface ReviewEvaluationFormValues {
  result: stateList;
  comments: string;
}

export interface PendingReviewData {
  formValues: ReviewEvaluationFormValues;
  file: File;
  annotatedFile?: File;
}

@Injectable()
export class ReviewPreliminaryDraftPageFacadeService {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly preliminaryDraftState = signal<PreliminaryDraft | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly pendingReviewData = signal<PendingReviewData | null>(null);

  readonly activeRevision = computed(() => {
    const preliminaryDraft = this.preliminaryDraftState();
    if (!preliminaryDraft?.documents) return null;
    return [...preliminaryDraft.documents]
      .filter(document => document.type === 'Anteproyecto' || document.type === 'Correccion')
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())[0];
  });

  init(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? this.route.parent?.snapshot.paramMap.get('id');
    if (id) {
      this.loadData(id);
    } else {
      this.showNavigationErrorNotification();
    }
  }

  private loadData(id: string): void {
    this.preliminaryDraftService.getPreliminaryDraftById(id).subscribe({
      next: (data) => {
        if (!data) {
          this.showNotFoundNotification();
          return;
        }

        const isEvaluator = data.evaluators?.some(evaluator => evaluator.id === this.authService.currentUser()?.id);
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

  handleRequestConfirmation(data: PendingReviewData): void {
    this.pendingReviewData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processEvaluation(): void {
    const data = this.pendingReviewData();
    const preliminaryDraft = this.preliminaryDraftState();
    const user = this.authService.currentUser();
    const revision = this.activeRevision();

    if (!data || !preliminaryDraft?.preliminaryDraftId || !user || !revision) {
      this.showValidationErrorNotification();
      return;
    }

    const documentsNames = [data.file.name];
    if (data.annotatedFile) documentsNames.push(data.annotatedFile.name);

    // Se evalúa directamente contra el enum
    const isApproved = data.formValues.result === stateList.APROBADO;

    const evaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: preliminaryDraft.proposalId,
      documentId: revision.id,
      evaluatorId: user.id,
      evaluatorName: `${user.firstName} ${user.lastName}`,
      evaluatorRole: 'Evaluador',
      veredict: data.formValues.result, // Asignamos directamente el resultado que ya es de tipo stateList
      observations: data.formValues.comments,
      signedDocuments: documentsNames,
      date: new Date()
    };

    this.preliminaryDraftService.addEvaluation(preliminaryDraft.preliminaryDraftId, evaluation).subscribe({
      next: () => {
        this.showEvaluationSuccessNotification(isApproved);
        this.isConfirmModalOpen.set(false);
        this.router.navigate(['../../'], { relativeTo: this.route });
      },
      error: () => this.showSaveErrorNotification()
    });
  }

  downloadCurrentDocument(): void {
    const revision = this.activeRevision();
    if (revision) {
      this.downloadService.download(revision.url, revision.name);
    } else {
      this.showDownloadErrorNotification();
    }
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private showEvaluationSuccessNotification(isApproved: boolean): void {
    this.notification.show({
      title: 'Evaluación Registrada',
      message: isApproved
        ? 'El veredicto positivo ha sido guardado exitosamente.'
        : 'Se ha registrado el veredicto negativo y se solicitarán correcciones.',
      type: NotificationType.CONFIRMATION
    });
  }
  private showAccessDeniedNotification(): void {
    this.notification.show({ title: 'Acceso Denegado', message: 'Usted no cuenta con permisos de evaluador asignados para este proyecto.', type: NotificationType.ERROR });
  }
  private showNavigationErrorNotification(): void {
    this.notification.show({ title: 'Error de navegación', message: 'No se pudo identificar el ID del anteproyecto en la ruta.', type: NotificationType.ERROR });
  }
  private showNotFoundNotification(): void {
    this.notification.show({ title: 'No encontrado', message: 'El anteproyecto solicitado no existe en nuestros registros.', type: NotificationType.INFO });
  }
  private showConnectionErrorNotification(): void {
    this.notification.show({ title: 'Error de conexión', message: 'No se pudo obtener la información del anteproyecto desde el servidor.', type: NotificationType.ERROR });
  }
  private showValidationErrorNotification(): void {
    this.notification.show({ title: 'Datos incompletos', message: 'No se pudo procesar la evaluación debido a que falta información del usuario o del documento.', type: NotificationType.ERROR });
  }
  private showSaveErrorNotification(): void {
    this.notification.show({ title: 'Error al guardar', message: 'Ocurrió un error técnico al intentar registrar su evaluación. Intente de nuevo.', type: NotificationType.ERROR });
  }
  private showDownloadErrorNotification(): void {
    this.notification.show({ title: 'Error de descarga', message: 'No se encontró un archivo válido para descargar en la revisión actual.', type: NotificationType.INFO });
  }
}
