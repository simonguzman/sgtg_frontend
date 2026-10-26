import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { SaveEvaluationPayload } from '../../../components/review-presentations-faculty-council-form/models/council-evaluation.model';
import { NavigationHistoryService } from '../../../../../core/services/navigation/navigation-history.service';

@Injectable()
export class ReviewPresentationsFacultyCouncilPageFacadeService {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notification = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly preliminaryDraftState = signal<PreliminaryDraft | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly pendingData = signal<SaveEvaluationPayload | null>(null);

  readonly filteredPreliminaryDraft = computed(() => {
    const preliminaryDraft = this.preliminaryDraftState();
    if (!preliminaryDraft?.documents) return null;

    const revisionHistoryVersion = [...preliminaryDraft.documents]
      .filter((document) => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));

    const activeRevisionId = revisionHistoryVersion[0]?.id;
    const currentIterationEvaluations = preliminaryDraft.evaluations?.filter(
      (evaluation) => evaluation.documentId === activeRevisionId
    ) || [];

    const linkedEvaluationFileRefs: FormattedDocument[] = currentIterationEvaluations.flatMap(
      (evaluation) => evaluation.signedDocuments || []
    );

    const visibleDocumentsForCouncil = preliminaryDraft.documents.filter((document) => {
      const isLatestIterationBase = document.id === activeRevisionId;
      const isLinkedEvaluationOutput = linkedEvaluationFileRefs.some(
        (fileRef) => fileRef.url === document.url
      );
      const isPermanentReference = [
        DocumentType.PROPUESTA,
        DocumentType.FORMATO_B,
        DocumentType.FORMATO_C,
        DocumentType.ANEXOS
      ].includes(document.type);
      return isLatestIterationBase || isLinkedEvaluationOutput || isPermanentReference;
    });

    return {
      ...preliminaryDraft,
      documents: visibleDocumentsForCouncil,
      evaluations: currentIterationEvaluations
    };
  });

  loadData(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? this.route.parent?.parent?.snapshot.paramMap.get('id');
    if (id) {
      this.preliminaryDraftService.getPreliminaryDraftById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            if (data) {
              this.preliminaryDraftState.set(data);
            } else {
              this.showNotFoundNotification();
            }
          },
          error: () => this.showServerErrorNotification()
        });
    }
  }

  handleRequestConfirmation(data: SaveEvaluationPayload): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  async processCouncilDecision(): Promise<void> {
    const data = this.pendingData();
    const preliminaryDraft = this.preliminaryDraftState();
    if (!data || !preliminaryDraft?.preliminaryDraftId) {
      this.showValidationErrorNotification();
      return;
    }

    const finalState = data.formValues.result === stateList.APROBADO ? stateList.APROBADO : stateList.NO_APROBADO;
    // El backend calcula la fecha máxima de entrega con el plazo elegido, desde hoy
    this.preliminaryDraftService.registerCouncilDecision(
        preliminaryDraft.preliminaryDraftId,
        finalState,
        data.formValues.comments ?? '',
        data.file,
        data.formValues.executionMonths
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSuccessNotification();
          this.isConfirmModalOpen.set(false);
          this.goBack();
        },
        error: (err) => this.showSaveErrorNotification(err)
      });
  }

  downloadFile(document: FormattedDocument | FileDocument): void {
    if (document?.url) {
      this.downloadService.download(document.url, document.name);
    } else {
      this.notification.show({
        title: 'Descarga no disponible',
        message: 'El archivo no tiene una ruta de descarga válida.',
        type: NotificationType.INFO
      });
    }
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['../'], { relativeTo: this.route, queryParams: { tab: 'PRESENTACIONES' } }));
  }

  private showNotFoundNotification(): void {
    this.notification.show({ title: 'Información no encontrada', message: 'No se pudo cargar el detalle del anteproyecto.', type: NotificationType.INFO });
  }
  private showServerErrorNotification(): void {
    this.notification.show({ title: 'Error de carga', message: 'Ocurrió un error al obtener los datos del servidor.', type: NotificationType.ERROR });
  }
  private showSuccessNotification(): void {
    this.notification.show({ title: 'Decisión Guardada', message: 'Se ha registrado la resolución del consejo de facultad exitosamente.', type: NotificationType.CONFIRMATION });
  }
  private showSaveErrorNotification(err?: unknown): void {
    this.notification.show({
      title: 'Error al guardar',
      message: apiErrorMessage(err, 'No se pudo registrar la decisión debido a un problema técnico.'),
      type: NotificationType.ERROR
    });
  }
  private showValidationErrorNotification(): void {
    this.notification.show({ title: 'Error de validación', message: 'Faltan datos críticos para procesar la resolución.', type: NotificationType.ERROR });
  }
}
