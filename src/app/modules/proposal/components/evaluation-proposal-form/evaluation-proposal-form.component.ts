import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Proposal } from '../../interfaces/proposal.interface';
import { User } from '../../../users/interfaces/user.interface';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

@Component({
  selector: 'app-evaluation-proposal-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FileUploadModalComponent,
    ConfirmationActionModalComponent,
    ButtonComponent,
    InfoBannerComponent
  ],
  templateUrl: './evaluation-proposal-form.component.html',
  styleUrls: ['./evaluation-proposal-form.component.css'],
})
export class EvaluationProposalFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  // --- Comunicación con el Page Component ---
  proposal = input.required<Proposal>();
  onDownloadOriginal = output<void>();
  onSaveEvaluation = output<{ result: string; comments: string; signedFileName: string }>();
  onGoBack = output<void>();

  // --- Estado local del Formulario y Modales ---
  signedFile = signal<{ name: string } | null>(null);
  formSubmitted = signal<boolean>(false); // <--- Flag para controlar el intento de envío
  modalState = signal({
    upload:  false,
    confirm: false
  });

  evaluationForm = this.fb.group({
    result:   ['', Validators.required],
    comments: ['', Validators.required]
  });

  // --- Getter de Validación para el Archivo (Estilo Guía) ---
  get isFileInvalid(): boolean {
    return this.formSubmitted() && !this.signedFile();
  }

  // --- Getters y Métodos de mapeo ---
  get originalDocument() {
    const docs = this.proposal()?.documents || [];
    // Al usar un ternario con un retorno explícito de null,
    // TS infiere automáticamente el tipo como: Documento | null
    return docs.length > 0 ? docs[0] : null;
  }

  get currentDocument() {
    const docs = this.proposal()?.documents || [];
    const evaluableDocs = docs.filter(doc =>
      doc.type === 'Propuesta' || doc.type === 'Correccion'
    );

    if (evaluableDocs.length === 0) return null;

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

  // --- Lógica de Interacción ---
  goBack(): void {
    this.onGoBack.emit();
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
    this.onDownloadOriginal.emit();
  }

  initiateEvaluationSubmit(): void {
    this.formSubmitted.set(true); // Se marca que hubo un intento de envío

    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      this.showInvalidFormNotification();
      return;
    }
    if (!this.signedFile()) {
      this.showMissingFileNotification();
      return;
    }
    this.setConfirmModal(true);
  }

  cancelEvaluation(): void {
    this.setConfirmModal(false);
  }

  confirmEvaluation(): void {
    this.setConfirmModal(false);
    const formValues = this.evaluationForm.value;

    this.onSaveEvaluation.emit({
      result: formValues.result!,
      comments: formValues.comments!,
      signedFileName: this.signedFile()!.name
    });
  }

  // --- Notificaciones del Formulario ---
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
}
