import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth/auth.service';
import { stateList } from '../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';

import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { ReviewPresentationsFacultyCouncilFormComponent } from "../../components/review-presentations-faculty-council-form/review-presentations-faculty-council-form.component";

import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';

@Component({
  selector: 'app-review-presentations-faculty-council-page',
  templateUrl: './review-presentations-faculty-council-page.component.html',
  styleUrls: ['./review-presentations-faculty-council-page.component.css'],
  imports: [ReviewPresentationsFacultyCouncilFormComponent, ConfirmationActionModalComponent]
})
export class ReviewPresentationsFacultyCouncilPageComponent implements OnInit {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly notification = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  preliminaryDraft = signal<PreliminaryDraft | null>(null);
  isConfirmModalOpen = signal(false);
  pendingData = signal<{ formValues: any, file: File } | null>(null);

  readonly filteredPreliminaryDraft = computed(() => {
    const preliminaryDraftState = this.preliminaryDraft();
    if (!preliminaryDraftState?.documents) return null;
    const revisionHistoryVersion = [...preliminaryDraftState.documents]
      .filter(document => document.type === 'Anteproyecto' || document.type === 'Correccion')
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    const activeRevisionId = revisionHistoryVersion[0]?.id;
    const currentIterationEvaluations = preliminaryDraftState.evaluations?.filter(
      evaluation => evaluation.documentId === activeRevisionId
    ) || [];
    const linkedEvaluationFileRefs = currentIterationEvaluations.flatMap(
      evaluation => evaluation.signedDocuments || []
    );
    const visibleDocumentsForCouncil = preliminaryDraftState.documents.filter(document => {
      const isLatestIterationBase = document.id === activeRevisionId;
      const isLinkedEvaluationOutput = linkedEvaluationFileRefs.some(fileRef =>
        fileRef === document.id || fileRef === document.name
      );

      const isPermanentReference = ['Propuesta', 'Formato', 'Anexos'].includes(document.type);
      return isLatestIterationBase || isLinkedEvaluationOutput || isPermanentReference;
    });
    return {
      ...preliminaryDraftState,
      documents: visibleDocumentsForCouncil,
      evaluations: currentIterationEvaluations
    };
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')
      ?? this.route.parent?.parent?.snapshot.paramMap.get('id');
    if (id) {
      this.preliminaryDraftService.getPreliminaryDraftByIdMock(id).subscribe({
        next: (data) => {
          if (data) {
            this.preliminaryDraft.set(data);
          } else {
            this.showNotFoundInformationNotification();
          }
        },
        error: () => {
          this.showChargeServerErrorNotification();
        }
      });
    }
  }

  handleRequestConfirmation(data: { formValues: any, file: File }) {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processCouncilDecision() {
    const data = this.pendingData();
    const preliminaryDraftState = this.preliminaryDraft();
    if (!data || !preliminaryDraftState?.preliminaryDraftId) {
      this.showValidationCouncilFacultyErrorNotification();
      return;
    }
    const finalState = data.formValues.result === 'Aprobado'
      ? stateList.APROBADO
      : stateList.NO_APROBADO;
    const presentationDoc = preliminaryDraftState.documents.find(document => document.type === 'Formato');
    const resolutionDoc: Document = {
      id: crypto.randomUUID(),
      name: data.file.name,
      url: '',
      uploadDate: new Date().toLocaleDateString(),
      type: DocumentType.RESOLUCION,
      status: finalState
    };
    const currentUser = this.authService.currentUser();
    const currentUserName = currentUser
      ? this.userService.getUserFullName(currentUser.id)
      : 'Consejo de Facultad';
    const councilEvaluation: Evaluation = {
      id: crypto.randomUUID(),
      documentId: presentationDoc?.id || '',
      proposalId: preliminaryDraftState.preliminaryDraftId,
      evaluatorId: currentUser?.id || '',
      evaluatorName: currentUserName,
      evaluatorRole: 'Consejo de facultad',
      veredict: finalState,
      observations: data.formValues.comments || 'Sin observaciones adicionales.',
      date: new Date(),
      signedDocuments: [resolutionDoc.name]
    };
    this.preliminaryDraftService.uploadCouncilResolutionMock(
      preliminaryDraftState.preliminaryDraftId,
      resolutionDoc,
      finalState,
      councilEvaluation
    ).subscribe({
      next: () => {
        this.showCouncilFacultyDecisionSuccessNotification();
        this.isConfirmModalOpen.set(false);
        this.router.navigate(['../../'], { relativeTo: this.route });
      },
      error: () => {
        this.showProccessCouncilFacultyErrorNotification();
      }
    });
  }

  downloadFile(document: Document) {
    if (document?.url) {
      this.downloadService.download(document.url, document.name);
    } else {
      this.showDownloadUnavailableNotification();
    }
  }

  goBack() {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  private showNotFoundInformationNotification(): void {
    this.notification.show({
      title: 'Información no encontrada',
      message: 'No se pudo cargar el detalle del anteproyecto.',
      type: NotificationType.INFO
    });
  }
  private showChargeServerErrorNotification(): void {
    this.notification.show({
      title: 'Error de carga',
      message: 'Ocurrió un error al obtener los datos del servidor.',
      type: NotificationType.ERROR
    });
  }

  private showCouncilFacultyDecisionSuccessNotification(): void {
    this.notification.show({
      title: 'Decisión Guardada',
      message: 'Se ha registrado la resolución del consejo de facultad exitosamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showDownloadUnavailableNotification(): void {
    this.notification.show({
      title: 'Descarga no disponible',
      message: `El archivo no tiene una ruta de descarga válida.`,
      type: NotificationType.INFO
    });
  }

  private showProccessCouncilFacultyErrorNotification(): void {
    this.notification.show({
      title: 'Error al guardar',
      message: 'No se pudo registrar la decisión debido a un problema técnico.',
      type: NotificationType.ERROR
    });
  }
  private showValidationCouncilFacultyErrorNotification(): void {
    this.notification.show({
      title: 'Error de validación',
      message: 'Faltan datos críticos para procesar la resolución.',
      type: NotificationType.ERROR
    });
  }
}
