import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../../users/services/user.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';
import { formatDisplayDate, parseDisplayDate } from '../../../../../core/utils/date-utils';
import { SaveEvaluationPayload } from '../../../components/review-presentations-faculty-council-form/models/council-evaluation.model';

@Injectable()
export class ReviewPresentationsFacultyCouncilPageFacadeService {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly notification = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly preliminaryDraftState = signal<PreliminaryDraft | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly pendingData = signal<SaveEvaluationPayload | null>(null);

  readonly filteredPreliminaryDraft = computed(() => {
    const preliminaryDraft = this.preliminaryDraftState();
    if (!preliminaryDraft?.documents) return null;

    const revisionHistoryVersion = [...preliminaryDraft.documents]
      .filter((document) => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION)
      .sort((a, b) => parseDisplayDate(b.uploadDate).getTime() - parseDisplayDate(a.uploadDate).getTime());

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
    const presentationDoc = preliminaryDraft.documents.find((document) => document.type === DocumentType.FORMATO_C);

    let resolutionFileUrl: string;
    try {
      resolutionFileUrl = await readFileAsDataUrl(data.file);
    } catch (err) {
      console.error('Error leyendo el archivo de resolución:', err);
      this.showFileReadErrorNotification();
      return;
    }

    const resolutionDoc: FileDocument = {
      id: crypto.randomUUID(),
      name: data.file.name,
      url: resolutionFileUrl,
      uploadDate: formatDisplayDate(new Date()),
      type: DocumentType.RESOLUCION,
      status: finalState
    };

    const currentUser = this.authService.currentUser();
    const currentUserName = currentUser ? this.userService.getUserFullName(currentUser.id) : 'Consejo de Facultad';

    const councilEvaluation: Evaluation = {
      id: crypto.randomUUID(),
      documentId: presentationDoc?.id || '',
      proposalId: preliminaryDraft.preliminaryDraftId,
      evaluatorId: currentUser?.id || '',
      evaluatorName: currentUserName,
      evaluatorRole: 'Consejo de facultad',
      veredict: finalState,
      observations: data.formValues.comments || 'Sin observaciones adicionales.',
      date: new Date(),
      signedDocuments: [{ name: resolutionDoc.name, url: resolutionFileUrl }]
    };

    this.preliminaryDraftService.uploadCouncilResolution(
        preliminaryDraft.preliminaryDraftId,
        resolutionDoc,
        finalState,
        councilEvaluation,
        data.formValues.maximumDeliveryDate ?? undefined
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSuccessNotification();
          this.isConfirmModalOpen.set(false);
          this.router.navigate(['../../'], { relativeTo: this.route });
        },
        error: () => this.showSaveErrorNotification()
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
    this.router.navigate(['../../'], { relativeTo: this.route });
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
  private showSaveErrorNotification(): void {
    this.notification.show({ title: 'Error al guardar', message: 'No se pudo registrar la decisión debido a un problema técnico.', type: NotificationType.ERROR });
  }
  private showValidationErrorNotification(): void {
    this.notification.show({ title: 'Error de validación', message: 'Faltan datos críticos para procesar la resolución.', type: NotificationType.ERROR });
  }

  private showFileReadErrorNotification(): void {
    this.notification.show({ title: 'Error al leer el archivo', message: 'No se pudo procesar el documento de resolución adjuntado.', type: NotificationType.ERROR });
  }
}
