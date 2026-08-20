import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';
import { PendingReviewData, ReviewEvaluationFormValues } from '../../../interfaces/review-preliminary-draft-payload.interface';

export type { ReviewEvaluationFormValues, PendingReviewData };

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

  // ← Mismo fix de string literal que en el archivo anterior.
  readonly activeRevision = computed(() => {
    const preliminaryDraft = this.preliminaryDraftState();
    if (!preliminaryDraft?.documents) return null;
    return [...preliminaryDraft.documents]
      .filter(document => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION)
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
    // ← first() agregado — faltaba en esta suscripción.
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

  // ← FIX CENTRAL: antes `signedDocuments: [data.file.name, data.annotatedFile?.name]`
  // guardaba solo nombres, sin ninguna referencia al contenido real —
  // exactamente el bug de tu captura. Ahora async: lee ambos archivos y
  // genera sus Data URLs reales antes de construir la evaluación.
  //
  // Nota de compatibilidad: si la página llama esto como
  // (confirm)="processEvaluation()" en el template, sigue funcionando
  // sin cambios — Angular acepta handlers que devuelven Promise sin
  // problema.
  async processEvaluation(): Promise<void> {
    const data = this.pendingReviewData();
    const preliminaryDraft = this.preliminaryDraftState();
    const user = this.authService.currentUser();
    const revision = this.activeRevision();

    if (!data || !preliminaryDraft?.preliminaryDraftId || !user || !revision) {
      this.showValidationErrorNotification();
      return;
    }

    let signedDocuments: FormattedDocument[];
    try {
      signedDocuments = await this.buildSignedDocuments(data);
    } catch (err) {
      console.error('Error leyendo los archivos de la evaluación:', err);
      this.showFileReadErrorNotification();
      return;
    }

    const isApproved = data.formValues.result === stateList.APROBADO;

    const evaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: preliminaryDraft.proposalId,
      documentId: revision.id,
      evaluatorId: user.id,
      evaluatorName: `${user.firstName} ${user.lastName}`,
      evaluatorRole: 'Evaluador',
      veredict: data.formValues.result,
      observations: data.formValues.comments,
      signedDocuments,
      date: new Date()
    };

    this.preliminaryDraftService.addEvaluation(preliminaryDraft.preliminaryDraftId, evaluation)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showEvaluationSuccessNotification(isApproved);
          this.isConfirmModalOpen.set(false);
          this.router.navigate(['../../'], { relativeTo: this.route });
        },
        error: () => this.showSaveErrorNotification()
      });
  }

  private async buildSignedDocuments(data: PendingReviewData): Promise<FormattedDocument[]> {
    const documents: FormattedDocument[] = [
      { name: data.file.name, url: await readFileAsDataUrl(data.file) }
    ];
    if (data.annotatedFile) {
      documents.push({ name: data.annotatedFile.name, url: await readFileAsDataUrl(data.annotatedFile) });
    }
    return documents;
  }

  // ← FIX: mismo patrón fire-and-forget que ya corregimos en el resto de
  // facades de descarga — quedó pendiente en este archivo porque el pase
  // anterior se enfocó solo en processEvaluation().
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
  private showFileReadErrorNotification(): void {
    this.notification.show({ title: 'Error al leer el archivo', message: 'No se pudo procesar alguno de los archivos adjuntos. Intente nuevamente.', type: NotificationType.ERROR });
  }
}
