import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { UploadFinalDeliveryFormService } from './services/upload-final-delivery-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Modality } from '../../../proposal/enums/modality.enum';
import { SustentationRequestFiles } from '../../services/thesis-work-sustentation.service';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { ProposalContentFieldsComponent } from '../../../../shared/components/proposal-content-fields/proposal-content-fields.component';

export type FileSlot = 'MONOGRAPH' | 'FORMAT_E' | 'ADVISOR_CONCEPT' | 'ANNEXES';
export type UploadedFile = { fileName: string; file: File };

/** Documento que se adjunta a la solicitud de sustentación. */
interface SlotConfig {
  key: FileSlot;
  label: string;
  hint: string;
  required: boolean;
}

/**
 * Solicitud de sustentación del director (entrega final): monografía,
 * formato E y paz y salvo obligatorios; en práctica profesional también el
 * concepto favorable del asesor; anexos opcionales. Todos en PDF.
 */
@Component({
  selector: 'app-upload-final-delivery-form',
  imports: [ReadonlyFieldComponent, ProposalContentFieldsComponent, FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
  providers: [UploadFinalDeliveryFormService],
  templateUrl: './upload-final-delivery-form.component.html',
  styleUrls: ['./upload-final-delivery-form.component.css']
})
export class UploadFinalDeliveryFormComponent implements OnInit {
  protected readonly formService = inject(UploadFinalDeliveryFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveDelivery = new EventEmitter<SustentationRequestFiles>();

  readonly uploaded = signal<Partial<Record<FileSlot, UploadedFile>>>({});
  readonly activeModal = signal<FileSlot | null>(null);
  readonly isSubmitAttempted = signal(false);
  protected slots: SlotConfig[] = [];
  readonly activeSlot = computed(() => this.slots.find(slot => slot.key === this.activeModal()) ?? null);

  ngOnInit(): void {
    const practica = this.thesisWork.preliminaryDraftData.proposalData.modality === Modality.PP;
    this.slots = [
      { key: 'MONOGRAPH', label: 'Monografía del trabajo de grado', hint: 'Documento principal', required: true },
      { key: 'FORMAT_E', label: 'Formato E', hint: 'Entrega final firmada', required: true },
      ...(practica
        ? [{ key: 'ADVISOR_CONCEPT' as FileSlot, label: 'Concepto del asesor', hint: 'Concepto favorable del asesor',
          required: true }]
        : []),
      { key: 'ANNEXES', label: 'Anexos', hint: 'Archivos complementarios en PDF', required: false }
    ];
  }

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  openModal(type: FileSlot): void { this.activeModal.set(type); }
  closeModal(): void { this.activeModal.set(null); }

  isMissing(slot: FileSlot): boolean {
    const config = this.slots.find(s => s.key === slot);
    return this.isSubmitAttempted() && !!config?.required && !this.uploaded()[slot];
  }

  handleFileUploaded(event: UploadedFile): void {
    const type = this.activeModal();
    if (type) this.uploaded.update(files => ({ ...files, [type]: event }));
    this.closeModal();
    this.formService.notifyFileAttached(event.fileName);
  }

  removeFile(type: FileSlot): void {
    this.uploaded.update(files => ({ ...files, [type]: undefined }));
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const files = this.uploaded();
    if (this.slots.some(slot => slot.required && !files[slot.key])) {
      this.formService.notifyMissingDocuments();
      return;
    }
    this.onSaveDelivery.emit({
      monograph: files.MONOGRAPH!.file,
      formatE: files.FORMAT_E!.file,
      advisorConcept: files.ADVISOR_CONCEPT?.file ?? null,
      annexes: files.ANNEXES?.file ?? null
    });
  }
}
