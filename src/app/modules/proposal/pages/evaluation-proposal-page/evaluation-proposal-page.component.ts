import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProposalService } from '../../services/proposal.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Proposal } from '../../interfaces/proposal.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../core/enums/state.enum';
import { Location, CommonModule } from '@angular/common';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { UserService } from '../../../users/services/user.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { User } from '../../../users/interfaces/user.interface';

const RESULT_TO_STATE: Record<string, stateList> = {
  'Aprobado':                    stateList.APROBADO,
  'Aprobado con observaciones':  stateList.APROBADO_CON_OBSERVACIONES,
  'No aprobado':                 stateList.NO_APROBADO
};
@Component({
  selector: 'app-evaluation-proposal-page',
  imports: [CommonModule, ReactiveFormsModule, FileUploadModalComponent, ConfirmationActionModalComponent, ButtonComponent],
  templateUrl: './evaluation-proposal-page.component.html',
  styleUrls: ['./evaluation-proposal-page.component.css'],
})
export class EvaluationProposalPageComponent implements OnInit  {
  private readonly route               = inject(ActivatedRoute);
  private readonly router              = inject(Router);
  private readonly location            = inject(Location);
  private readonly proposalService     = inject(ProposalService);
  private readonly downloadService     = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly fb                  = inject(FormBuilder);

  proposal = signal<Proposal | null>(null);
  signedFile = signal<{ name: string } | null>(null);

  modalState = signal({
    upload:  false,
    confirm: false
  });

  evaluationForm = this.fb.group({
    result:   ['', Validators.required],
    comments: ['', Validators.required]
  });

  displayFields = computed(() => {
    const proposal = this.proposal();
    if (!proposal) return [];

    return [
      { label: 'Título', value: proposal.title },
      { label: 'Fecha de carga', value: this.documentUploadDate },
      { label: 'Modalidad', value: proposal.modality },
      { label: 'Estudiante(s)', value: this.userService.getAuthorsNames(proposal.authors) },
      { label: 'Director', value: this.userService.getUserFullName(proposal.director.id) },
      ...(proposal.codirector ? [{ label: 'Codirector', value: this.userService.getUserFullName(proposal.codirector.id) }] : []),
      ...(proposal.advisor ? [{ label: 'Asesor', value: this.userService.getUserFullName(proposal.advisor.id) }] : []),
      { label: 'Estado Actual', value: proposal.state }
    ];
  });

  getStudentNames(authors: User[] | undefined): string {
    if (!authors || authors.length === 0) {
      return 'Sin autores';
    }

    return authors
      .map(author =>
        `${author.firstName} ${author.secondName || ''} ${author.lastName} ${author.secondLastName || ''}`
          .replace(/\s+/g, ' ')
          .trim()
      )
      .join(', ');
  }

  getDirectorName(directorId: string | undefined): string {
    return this.userService.getUserFullName(directorId);
  }

  getCodirectorName(codirectorId: string | undefined): string {
    if (!codirectorId) return '';
    return this.userService.getUserFullName(codirectorId);
  }


  getAdvisorName(advisorId: string | undefined): string {
    if (!advisorId) return '';
    return this.userService.getUserFullName(advisorId);
  }

  get originalDocument() {
    return this.proposal()?.documents?.[0] ?? null;
  }

  get currentDocument() {
    const docs = this.proposal()?.documents || [];
    const evaluableDocs = docs.filter(doc =>
      doc.type === 'Propuesta' || doc.type === 'Correccion'
    );

    if (evaluableDocs.length === 0) return null;

    // Creamos una copia con [...] y luego ordenamos
    return [...evaluableDocs].sort((a, b) => {
      const dateA = new Date(a.uploadDate).getTime();
      const dateB = new Date(b.uploadDate).getTime();
      return dateB - dateA;
    })[0];
  }

  get documentUploadDate(): string {
    const documentDate = this.currentDocument?.uploadDate;
    if (!documentDate) return 'Fecha no disponible';
    return documentDate instanceof Date
      ? documentDate.toLocaleDateString('es-ES')
      : documentDate;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
            ?? this.route.parent?.snapshot.paramMap.get('id');

    if (!id) { this.location.back(); return; }

    this.proposalService.getProposalByIdMock(id).subscribe({
      next:  (data) => data ? this.proposal.set(data) : this.goBack(),
      error: ()     => this.goBack()
    });
  }

  setUploadModal(isOpen: boolean): void {
    this.modalState.update(state => ({ ...state, upload: isOpen }));
  }

  setConfirmModal(isOpen: boolean): void {
    this.modalState.update(state => ({ ...state, confirm: isOpen }));
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.signedFile.set({ name: event.fileName });
    this.setUploadModal(false);
    this.showFileUploadSuccessNotification();
  }

  removeSignedFile(): void {
    this.signedFile.set(null);
    this.showFileRemovedNotification();
  }

  downloadOriginalDocument(): void {
    const doc = this.originalDocument;
    if (!doc?.url?.trim()) {
      this.showDownloadErrorNotification();
      return;
    }
    this.showDownloadStartedNotification();
    this.downloadService.download(doc.url, doc.name);
  }

  initiateEvaluationSubmit(): void {
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      this.showInvalidFormNotification();
      return;
    }
    if (!this.signedFile()) {
      this.showMissingFileNotification();
      return; // ← faltaba este return
    }
    this.setConfirmModal(true);
  }

  confirmEvaluation(): void {
    const currentProposal = this.proposal();
    const currentUser = this.authService.currentUser();
    const formValues = this.evaluationForm.value;

    const targetDocument = this.currentDocument;

    if (!currentProposal?.id || !currentUser || !formValues.result || !targetDocument) {
      this.showUpdateErrorNotification();
      return;
    }

    this.setConfirmModal(false);

    const newState = RESULT_TO_STATE[formValues.result] ?? currentProposal.state;

    const newEvaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: currentProposal.id,
      documentId: targetDocument.id, // <-- SOLUCIÓN: Vinculamos el ID del documento
      evaluatorName: this.userService.getUserFullName(currentUser.id),
      evaluatorRole: currentUser.roles[0] ?? 'Evaluador',
      signedDocuments: this.signedFile() ? [this.signedFile()!.name] : [],
      veredict: newState,
      observations: formValues.comments ?? '',
      date: new Date()
    };

    this.proposalService.addEvaluationMock(currentProposal.id, newEvaluation).subscribe({
      next: () => {
        this.showEvaluationSuccessNotification();
        this.router.navigate(['../../'], { relativeTo: this.route });
      },
      error: () => this.showUpdateErrorNotification()
    });
  }

  cancelEvaluation(): void {
    this.setConfirmModal(false);
  }

  goBack(): void {
    this.location.back();
  }

  private showFileUploadSuccessNotification() {
    this.notificationService.show({
      title: 'Formato A adjuntado',
      message: 'El documento firmado se ha vinculado correctamente a esta evaluación.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showFileRemovedNotification() {
    this.notificationService.show({
      title: 'Documento removido',
      message: 'Se ha quitado el formato firmado. Recuerde que es obligatorio para finalizar.',
      type: NotificationType.INFO
    });
  }

  private showInvalidFormNotification() {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: 'Por favor, asegúrese de seleccionar un veredicto y escribir sus observaciones.',
      type: NotificationType.ERROR
    });
  }

  private showMissingFileNotification() {
    this.notificationService.show({
      title: 'Documento requerido',
      message: 'Debe cargar el Formato A firmado para poder registrar la evaluación.',
      type: NotificationType.ERROR
    });
  }

  private showEvaluationSuccessNotification() {
    this.notificationService.show({
      title: 'Evaluación registrada',
      message: 'La decisión del comité ha sido guardada y el estado de la propuesta actualizado.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showBusinessRuleNotification(message: string) {
    this.notificationService.show({
      title: 'Restricción de proceso',
      message: message,
      type: NotificationType.ERROR
    });
  }

  private showDownloadStartedNotification() {
    this.notificationService.show({
      title: 'Descarga iniciada',
      message: 'Descargando la propuesta original para su revisión...',
      type: NotificationType.INFO
    });
  }

  private showDownloadErrorNotification() {
    this.notificationService.show({
      title: 'Error de descarga',
      message: 'No se pudo obtener el documento original. Contacte a soporte técnico.',
      type: NotificationType.ERROR
    });
  }

  private showUpdateErrorNotification() {
    this.notificationService.show({
      title: 'Error de servidor',
      message: 'Hubo un problema al guardar la evaluación. Intente nuevamente en unos minutos.',
      type: NotificationType.ERROR
    });
  }
}
