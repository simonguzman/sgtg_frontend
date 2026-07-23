import { Component, effect, EventEmitter, inject, input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';

import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { PreliminaryDraftFormService } from './services/preliminary-draft-form.service';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';

import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-preliminary-draft-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FileUploadModalComponent,
    NgTemplateOutlet,
    InfoBannerComponent,
    SearchableSelectComponent
  ],
  providers: [PreliminaryDraftFormService],
  templateUrl: './preliminary-draft-form.component.html',
  styleUrls: ['./preliminary-draft-form.component.css']
})
export class PreliminaryDraftFormComponent {
  readonly formService = inject(PreliminaryDraftFormService);
  private readonly notificationService = inject(NotificationService);

  preliminaryDraft = input<PreliminaryDraft | null>(null);
  @Output() onSave = new EventEmitter<PreliminaryDraft>();

  attachedFile = { hasFile: false, name: null as string | null, file: null as File | null };
  uploadModalOpen = false;

  constructor() {
    effect(() => {
      const currentPreliminaryDraft = this.preliminaryDraft();
      if (currentPreliminaryDraft) {
        this.formService.initForEdit(currentPreliminaryDraft);
        const mainDoc = currentPreliminaryDraft.documents.find(preliminaryDraft => preliminaryDraft.type === 'Anteproyecto');
        this.attachedFile = {
          hasFile: !!mainDoc,
          name: mainDoc?.name ?? null,
          file: null
        };
        if (mainDoc) {
           this.form.get('document')?.setValue(mainDoc);
        }
      } else {
        this.formService.initForCreate();
        this.attachedFile = { hasFile: false, name: null, file: null };
      }
    }, { allowSignalWrites: true });
  }

  get isEditMode(): boolean { return !!this.preliminaryDraft(); }
  get form() { return this.formService.form; }

  // Exponemos las signals al template
  get proposalOptions(): SelectOption[] { return this.formService.proposalOptions(); }
  get selectedProposal() { return this.formService.selectedProposal(); }
  get proposalEvaluationDocument() { return this.formService.proposalEvaluationDocument(); }

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

    this.notificationService.show({
      title: 'Archivo adjuntado',
      message: 'El documento del anteproyecto se ha cargado correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  removeFile(): void {
    this.attachedFile = { hasFile: false, name: null, file: null };
    this.form.get('document')?.setValue(null);
    this.form.get('document')?.markAsTouched();

    this.notificationService.show({
      title: 'Archivo removido',
      message: 'Se ha quitado el documento adjunto.',
      type: NotificationType.INFO
    });
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.notificationService.show({
        title: 'Datos incompletos',
        message: 'Por favor, asegúrese de seleccionar una propuesta y adjuntar el anteproyecto.',
        type: NotificationType.ERROR
      });
      return;
    }

    const payload = this.formService.buildPreliminaryDraftPayload(this.preliminaryDraft(), this.mapDocuments());

    if (!payload) return;

    this.onSave.emit(payload);
  }

  private mapDocuments(): FileDocument[] {
    const existingDocument = this.preliminaryDraft()?.documents.find(d => d.type === 'Anteproyecto');

    if (this.attachedFile.hasFile && this.attachedFile.name === existingDocument?.name) {
      return [existingDocument!];
    }

    if (this.attachedFile.hasFile) {
      return [{
        id: crypto.randomUUID(),
        name: this.attachedFile.name!,
        url: '',
        uploadDate: new Date().toLocaleDateString('es-ES').replaceAll('/', ' - '),
        type: DocumentType.ANTEPROYECTO,
        status: stateList.EN_REVISION
      }];
    }
    return [];
  }
}
