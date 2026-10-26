import { Component, computed, effect, EventEmitter, inject, input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { PreliminaryDraftFormService } from './services/preliminary-draft-form.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { proposalContent } from '../../../../shared/components/work-details/work-details.builder';

@Component({
  selector: 'app-preliminary-draft-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, NgTemplateOutlet, InfoBannerComponent, SearchableSelectComponent],
  providers: [PreliminaryDraftFormService],
  templateUrl: './preliminary-draft-form.component.html',
  styleUrls: ['./preliminary-draft-form.component.css']
})
export class PreliminaryDraftFormComponent {
  readonly formService = inject(PreliminaryDraftFormService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);

  preliminaryDraft = input<PreliminaryDraft | null>(null);
  @Output() onSave = new EventEmitter<PreliminaryDraft>();

  attachedFile = { hasFile: false, name: null as string | null, file: null as File | null };
  uploadModalOpen = false;

  constructor() {
    effect(() => {
      const currentPreliminaryDraft = this.preliminaryDraft();
      if (currentPreliminaryDraft) {
        this.formService.initForEdit(currentPreliminaryDraft);
        const mainDoc = currentPreliminaryDraft.documents.find(preliminaryDraft => preliminaryDraft.type === DocumentType.ANTEPROYECTO);
        this.attachedFile = { hasFile: !!mainDoc, name: mainDoc?.name ?? null, file: null };
        if (mainDoc) this.form.get('document')?.setValue(mainDoc);
      } else {
        this.formService.initForCreate();
        this.attachedFile = { hasFile: false, name: null, file: null };
      }
    }, { allowSignalWrites: true });
  }

  get isEditMode(): boolean { return !!this.preliminaryDraft(); }
  get form() { return this.formService.form; }
  get proposalOptions(): SelectOption[] { return this.formService.proposalOptions(); }
  get selectedProposal() { return this.formService.selectedProposal(); }
  get proposalEvaluationDocument() { return this.formService.proposalEvaluationDocument(); }
  get specificObjectives() { return this.formService.specificObjectives; }

  addSpecificObjective(): void { this.formService.addSpecificObjective(); }
  removeSpecificObjective(index: number): void { this.formService.removeSpecificObjective(index); }

  /** Qué es el documento cargado: al corregir, la versión vigente o la nueva que se radicará */
  get documentHint(): string {
    if (!this.isEditMode) return 'Documento base (Obligatorio)';
    return this.attachedFile.file ? 'Nueva versión: se radicará al actualizar' : 'Versión vigente del anteproyecto';
  }
  /** Objetivos, descripción, línea de investigación y organización registrados en la propuesta elegida */
  readonly content = computed(() => {
    const proposal = this.formService.selectedProposal();
    return proposal ? proposalContent(proposal) : null;
  });

  /** Descarga el formato A firmado por el Comité con la sesión del usuario (el enlace directo no lleva el token). */
  async downloadEvaluationDocument(): Promise<void> {
    const document = this.proposalEvaluationDocument;
    if (!document?.url?.trim()) {
      this.notificationService.show({ title: 'Error de descarga', message: 'No se pudo obtener el formato A firmado por el Comité.', type: NotificationType.ERROR });
      return;
    }
    try {
      await this.downloadService.download(document.url, document.name);
    } catch {
      this.notificationService.show({ title: 'Error de descarga', message: 'No se pudo descargar el documento. Intente más tarde.', type: NotificationType.ERROR });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
  isFieldValid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.valid && field?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.attachedFile = { hasFile: true, name: event.fileName, file: event.file };
    this.form.get('document')?.setValue(event.file);
    this.form.get('document')?.markAsTouched();
    this.uploadModalOpen = false;
    this.notificationService.show({ title: 'Archivo adjuntado', message: 'El documento del anteproyecto se ha cargado correctamente.', type: NotificationType.CONFIRMATION });
  }

  removeFile(): void {
    this.attachedFile = { hasFile: false, name: null, file: null };
    this.form.get('document')?.setValue(null);
    this.form.get('document')?.markAsTouched();
    this.notificationService.show({ title: 'Archivo removido', message: 'Se ha quitado el documento adjunto.', type: NotificationType.INFO });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificationService.show({ title: 'Datos incompletos', message: 'Por favor, asegúrese de seleccionar una propuesta y adjuntar el anteproyecto.', type: NotificationType.ERROR });
      return;
    }

    // Se envía el PDF elegido; en edición, sin archivo nuevo no hay versión que radicar
    const payload = this.formService.buildPreliminaryDraftPayload(this.preliminaryDraft(), this.attachedFile.file);
    if (!payload) return;
    this.onSave.emit(payload);
  }
}
