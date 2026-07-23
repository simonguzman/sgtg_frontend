import { Component, effect, EventEmitter, inject, input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ProposalFormService } from './services/proposal-form.service';

import { Proposal } from '../../interfaces/proposal.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';

import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FileUploadModalComponent,
    InfoBannerComponent,
    SearchableSelectComponent
  ],
  providers: [ProposalFormService],
  templateUrl: './proposal-form.component.html',
  styleUrls: ['./proposal-form.component.css']
})
export class ProposalFormComponent {
  readonly formService = inject(ProposalFormService);
  private readonly notificationService = inject(NotificationService);

  proposal = input<Proposal | null>(null);
  @Output() onSubmit = new EventEmitter<Proposal>();

  attachedFile = { hasFile: false, name: null as string | null, file: null as File | null };
  uploadModalOpen = false;

  get modalityOptions(): SelectOption[] {
    return this.formService.modalityOptions;
  }

  student1Options(): SelectOption[] {
    return this.formService.student1Options();
  }

  student2Options(): SelectOption[] {
    return this.formService.student2Options();
  }

  codirectorOptions(): SelectOption[] {
    return this.formService.codirectorOptions();
  }

  advisorOptions(): SelectOption[] {
    return this.formService.advisorOptions();
  }

  constructor() {
    effect(() => {
      const currentProposal = this.proposal();
      if (currentProposal) {
        this.formService.initForEdit(currentProposal);
        this.attachedFile = {
          hasFile: currentProposal.documents.length > 0,
          name: currentProposal.documents[0]?.name ?? null,
          file: null
        };
      } else {
        this.formService.initForCreate();
        this.attachedFile = { hasFile: false, name: null, file: null };
      }
    }, { allowSignalWrites: true });
  }

  get isEditMode(): boolean { return !!this.proposal(); }
  get form() { return this.formService.form; }
  get showAdvisorField(): boolean { return this.form.get('modality')?.value === 'Practica profesional'; }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.valid && field?.touched);
  }

  hasValue(fieldName: string): boolean {
    const nameValue = this.form.get(fieldName)?.value;
    return nameValue !== null && nameValue !== undefined && nameValue !== '';
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.attachedFile = { hasFile: true, name: event.fileName, file: event.file };
    this.uploadModalOpen = false;
    this.notificationService.show({ title: 'Archivo cargado', message: 'Documento adjuntado correctamente.', type: NotificationType.CONFIRMATION });
  }

  removeFile(): void {
    this.attachedFile = { hasFile: false, name: null, file: null };
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.notificationService.show({ title: 'Formulario incorrecto', message: 'Diligencie todos los campos obligatorios.', type: NotificationType.ERROR });
      return;
    }

    if (!this.isEditMode && !this.attachedFile.hasFile) {
      this.notificationService.show({ title: 'Archivo requerido', message: 'Debe adjuntar el formato de propuesta.', type: NotificationType.ERROR });
      return;
    }

    const payload = this.formService.buildProposalPayload(this.proposal(), this.mapDocuments());

    if (!payload) {
      this.notificationService.show({ title: 'Error', message: 'No se pudo identificar al director.', type: NotificationType.ERROR });
      return;
    }

    this.onSubmit.emit(payload);
  }

  private mapDocuments(): FileDocument[] {
    if (this.isEditMode) return this.proposal()?.documents ?? [];
    if (!this.attachedFile.hasFile) return [];

    return [{
      id: crypto.randomUUID(),
      name: this.attachedFile.name!,
      url: '',
      uploadDate: new Date().toLocaleDateString('es-ES').replaceAll('/', ' - '),
      type: DocumentType.PROPUESTA,
      status: stateList.EN_REVISION
    }];
  }
}
