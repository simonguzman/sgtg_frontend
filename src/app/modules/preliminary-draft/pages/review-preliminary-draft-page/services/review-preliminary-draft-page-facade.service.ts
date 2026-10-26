import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { PendingReviewData, ReviewEvaluationFormValues } from '../../../interfaces/review-preliminary-draft-payload.interface';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';

export type { ReviewEvaluationFormValues, PendingReviewData };

@Injectable()
export class ReviewPreliminaryDraftPageFacadeService {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);

  readonly preliminaryDraftState = signal<PreliminaryDraft | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly pendingReviewData = signal<PendingReviewData | null>(null);

  readonly activeRevision = computed(() => {
    const preliminaryDraft = this.preliminaryDraftState();
    if (!preliminaryDraft?.documents) return null;
    return [...preliminaryDraft.documents]
      .filter(document => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION)
      // La versión que se evalúa es la más reciente (por número de versión)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0] ?? null;
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
    this.preliminaryDraftService.getPreliminaryDraftById(id)
      .pipe(first())
      .subscribe({
        next: (data) => {
          if (!data) {
            this.showNotFoundNotification();
            return;
          }
          const isEvaluator = data.evaluators?.some(evaluator => evaluator.id === this.authService.currentUser()?.id);
          if (!isEvaluator) {
            this.showAccessDeniedNotification();
            this.goBack();
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

  async processEvaluation(): Promise<void> {
    const data = this.pendingReviewData();
    const preliminaryDraft = this.preliminaryDraftState();
    const user = this.authService.currentUser();
    if (!data || !preliminaryDraft?.preliminaryDraftId || !user) {
      this.showValidationErrorNotification();
      return;
    }

    const isApproved = data.formValues.result === stateList.APROBADO;
    // Formato B firmado (obligatorio) y, si lo adjuntó, el documento con sus anotaciones
    this.preliminaryDraftService.registerEvaluatorConcept(preliminaryDraft.preliminaryDraftId,
      isApproved ? 'APROBADO' : 'CON_CORRECCIONES', data.formValues.comments, data.file, data.annotatedFile ?? null)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showEvaluationSuccessNotification(isApproved);
          this.isConfirmModalOpen.set(false);
          this.navigation.back(() => this.router.navigate(['../../'], { relativeTo: this.route }));
        },
        error: (err) => this.showSaveErrorNotification(err)
      });
  }

  async downloadCurrentDocument(): Promise<void> {
    const revision = this.activeRevision();
    if (!revision) {
      this.showDownloadErrorNotification();
      return;
    }
    try {
      await this.downloadService.download(revision.url, revision.name);
    } catch (err) {
      console.error('Error al descargar el documento:', err);
      this.showDownloadErrorNotification();
    }
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['../'], { relativeTo: this.route }));
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
  private showSaveErrorNotification(err?: unknown): void {
    this.notification.show({
      title: 'Error al guardar',
      message: apiErrorMessage(err, 'Ocurrió un error técnico al intentar registrar su evaluación. Intente de nuevo.'),
      type: NotificationType.ERROR
    });
  }
  private showDownloadErrorNotification(): void {
    this.notification.show({ title: 'Error de descarga', message: 'No se encontró un archivo válido para descargar en la revisión actual.', type: NotificationType.INFO });
  }
}
