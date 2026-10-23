import { Component, effect, EventEmitter, inject, input, signal, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ProposalFormService } from './services/proposal-form.service';
import { Proposal } from '../../interfaces/proposal.interface';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

/** Archivo elegido en el formulario (aún no enviado al backend). */
interface AttachedFile {
  hasFile: boolean;
  name: string | null;
  file: File | null;
}

const SIN_ARCHIVO: AttachedFile = { hasFile: false, name: null, file: null };

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent, SearchableSelectComponent],
  providers: [ProposalFormService],
  templateUrl: './proposal-form.component.html',
  styleUrls: ['./proposal-form.component.css']
})
export class ProposalFormComponent {
  readonly formService = inject(ProposalFormService);
  private readonly notificationService = inject(NotificationService);

  proposal = input<Proposal | null>(null);
  @Output() onSubmit = new EventEmitter<Proposal>();

  /** Formato A: obligatorio al crear; al corregir, uno nuevo se radica como nueva versión. */
  attachedFile: AttachedFile = { ...SIN_ARCHIVO };
  /** Carta de aceptación (práctica profesional, solo al crear). */
  acceptanceLetter: AttachedFile = { ...SIN_ARCHIVO };
  uploadModalOpen = false;
  letterModalOpen = false;

  readonly isSubmitAttempted = signal(false);

  get modalityOptions(): SelectOption[] { return this.formService.modalityOptions; }
  student1Options(): SelectOption[] { return this.formService.student1Options(); }
  student2Options(): SelectOption[] { return this.formService.student2Options(); }
  codirectorOptions(): SelectOption[] { return this.formService.codirectorOptions(); }
  advisorOptions(): SelectOption[] { return this.formService.advisorOptions(); }

  constructor() {
    effect(() => {
      const currentProposal = this.proposal();
      if (currentProposal) {
        this.formService.initForEdit(currentProposal);
        // La versión vigente ya está radicada; solo se carga un archivo si hay una nueva versión
        const vigente = currentProposal.documents[0];
        this.attachedFile = { hasFile: !!vigente, name: vigente?.name ?? null, file: null };
      } else {
        this.formService.initForCreate();
        this.attachedFile = { ...SIN_ARCHIVO };
      }
      this.acceptanceLetter = { ...SIN_ARCHIVO };
    });
  }

  get isEditMode(): boolean { return !!this.proposal(); }
  get form() { return this.formService.form; }
  get specificObjectives() { return this.formService.specificObjectives; }
  addSpecificObjective(): void { this.formService.addSpecificObjective(); }
  removeSpecificObjective(index: number): void { this.formService.removeSpecificObjective(index); }
  get showAdvisorField(): boolean { return this.formService.isProfessionalPractice(); }
  get isFileFieldInvalid(): boolean {
    return this.isSubmitAttempted() && !this.attachedFile.hasFile;
  }
  get isLetterFieldInvalid(): boolean {
    return this.isSubmitAttempted() && this.showAdvisorField && !this.isEditMode && !this.acceptanceLetter.hasFile;
  }

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

  handleLetterUploaded(event: { fileName: string; file: File }): void {
    this.acceptanceLetter = { hasFile: true, name: event.fileName, file: event.file };
    this.letterModalOpen = false;
    this.notificationService.show({ title: 'Archivo cargado', message: 'Carta de aceptación adjuntada correctamente.', type: NotificationType.CONFIRMATION });
  }

  removeFile(): void {
    this.attachedFile = { ...SIN_ARCHIVO };
  }

  removeAcceptanceLetter(): void {
    this.acceptanceLetter = { ...SIN_ARCHIVO };
  }

  submit(): void {
    this.isSubmitAttempted.set(true);

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificationService.show({ title: 'Formulario incorrecto', message: 'Diligencie todos los campos obligatorios.', type: NotificationType.ERROR });
      return;
    }

    if (!this.attachedFile.hasFile) {
      this.notificationService.show({ title: 'Archivo requerido', message: 'Debe adjuntar el formato de propuesta.', type: NotificationType.ERROR });
      return;
    }

    if (this.isLetterFieldInvalid) {
      this.notificationService.show({ title: 'Archivo requerido', message: 'Debe adjuntar la carta de aceptación de la organización.', type: NotificationType.ERROR });
      return;
    }

    const payload = this.formService.buildProposalPayload(this.proposal(), {
      proposal: this.attachedFile.file,
      acceptanceLetter: this.acceptanceLetter.file
    });
    if (!payload) {
      this.notificationService.show({ title: 'Error', message: 'No se pudo identificar al director.', type: NotificationType.ERROR });
      return;
    }
    this.onSubmit.emit(payload);
  }
}
