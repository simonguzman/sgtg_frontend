import { Component, effect, EventEmitter, inject, input, signal, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ProposalFormService } from './services/proposal-form.service';
import { Proposal } from '../../interfaces/proposal.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { readFileAsDataUrl } from '../../../../core/utils/file-reader.utils';
import { formatDisplayDate } from '../../../../core/utils/date-utils';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

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

  attachedFile = { hasFile: false, name: null as string | null, file: null as File | null };
  uploadModalOpen = false;

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

  // ← FIX: se elimina `!this.isEditMode` — el documento es obligatorio en
  // ambos modos. Antes, quitar el archivo en edición nunca activaba esta
  // condición, así que la alerta visual jamás aparecía.
  get isFileFieldInvalid(): boolean {
    return this.isSubmitAttempted() && !this.attachedFile.hasFile;
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

  removeFile(): void {
    this.attachedFile = { hasFile: false, name: null, file: null };
  }

  async submit(): Promise<void> {
    this.isSubmitAttempted.set(true);

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificationService.show({ title: 'Formulario incorrecto', message: 'Diligencie todos los campos obligatorios.', type: NotificationType.ERROR });
      return;
    }
    // ← FIX: se elimina `!this.isEditMode &&` — antes esta guarda solo
    // bloqueaba el envío en creación. Quitar el documento en edición y
    // enviar pasaba de largo por aquí sin ningún aviso.
    if (!this.attachedFile.hasFile) {
      this.notificationService.show({ title: 'Archivo requerido', message: 'Debe adjuntar el formato de propuesta.', type: NotificationType.ERROR });
      return;
    }

    let documents: FileDocument[];
    try {
      documents = await this.mapDocuments();
    } catch (err) {
      console.error('Error leyendo el archivo de la propuesta:', err);
      this.notificationService.show({ title: 'Error al leer el archivo', message: 'No se pudo procesar el archivo adjuntado.', type: NotificationType.ERROR });
      return;
    }

    const payload = this.formService.buildProposalPayload(this.proposal(), documents);
    if (!payload) {
      this.notificationService.show({ title: 'Error', message: 'No se pudo identificar al director.', type: NotificationType.ERROR });
      return;
    }
    this.onSubmit.emit(payload);
  }

  // ← FIX CENTRAL: antes, en modo edición, esta función devolvía
  // `this.proposal()?.documents` sin mirar attachedFile en absoluto —
  // ignoraba por completo si el usuario había quitado o reemplazado el
  // archivo en la UI. Ahora distingue explícitamente los 3 estados
  // reales posibles.
  private async mapDocuments(): Promise<FileDocument[]> {
    // Caso 1: hay un File real (creación, o reemplazo del documento en
    // edición vía handleFileUploaded) — se lee y se construye un
    // documento nuevo.
    if (this.attachedFile.hasFile && this.attachedFile.file) {
      const fileUrl = await readFileAsDataUrl(this.attachedFile.file);
      return [{
        id: crypto.randomUUID(),
        name: this.attachedFile.name!,
        url: fileUrl,
        uploadDate: formatDisplayDate(new Date()),
        type: DocumentType.PROPUESTA,
        status: stateList.EN_REVISION
      }];
    }
    // Caso 2: edición, el usuario no tocó el archivo (sigue marcado como
    // presente pero sin un File nuevo que leer — es el estado inicial al
    // abrir el formulario) — se conserva el documento original.
    if (this.isEditMode && this.attachedFile.hasFile) {
      return this.proposal()?.documents ?? [];
    }
    // Caso 3: sin archivo. submit() ya bloquea este estado antes de
    // llegar aquí — se conserva como salvaguarda, sin reutilizar nada
    // en silencio si algún día se llama a este método por otra vía.
    return [];
  }
}
