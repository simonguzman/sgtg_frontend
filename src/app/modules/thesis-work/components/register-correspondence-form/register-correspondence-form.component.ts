import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { RegisterCorrespondenceFormService } from './services/register-correspondence-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { ProposalContentFieldsComponent } from '../../../../shared/components/proposal-content-fields/proposal-content-fields.component';

@Component({
  selector: 'app-register-correspondence-form',
  templateUrl: './register-correspondence-form.component.html',
  styleUrls: ['./register-correspondence-form.component.css'],
  imports: [ProposalContentFieldsComponent, ButtonComponent, DatePipe, InfoBannerComponent, FileUploadModalComponent, ReadonlyFieldComponent],
  providers: [RegisterCorrespondenceFormService]
})
export class RegisterCorrespondenceFormComponent {
  protected readonly formService = inject(RegisterCorrespondenceFormService);
  thesisWork = input.required<ThesisWork>();
  isSubmitting = input<boolean>(false);
  onSave = output<File>();
  onGoBack = output<void>();

  readonly selectedFile = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen  = signal(false);

  /**
   * Formato E que adjuntó el Consejo al programar la última sesión (si la
   * sustentación se aplazó, el de la segunda programación); sin sesiones, el
   * de la solicitud vigente. Las sesiones vienen de la más reciente a la más antigua.
   */
  readonly formatoEDoc = computed<FileDocument | undefined>(() => {
    const thesis = this.thesisWork();
    return thesis.sustentations?.find(sesion => !!sesion.formatEDocument)?.formatEDocument
      ?? thesis.finalDeliveries?.[0]?.formatE;
  });
  /** Paz y salvo (formato F) aprobado de la solicitud vigente */
  readonly formatoFDoc = computed<FileDocument | undefined>(() => this.thesisWork().finalDeliveries?.[0]?.pazYSalvo);
  /** Acta (formato G) de la última sesión calificada */
  readonly formatoGDoc = computed<FileDocument | undefined>(() =>
    (this.thesisWork().sustentations ?? [])
      .flatMap(sesion => sesion.verdicts.map(veredicto => veredicto.attachedDocument))
      .find((documento): documento is FileDocument => !!documento));

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork()); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork()); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork()); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork()); }
  getMemberName(userId: string | undefined): string { return this.formService.getMemberName(userId); }

  downloadDocument(document: FileDocument | undefined | null): void {
    void this.formService.downloadDocument(document);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.selectedFile.set(event);
    this.isModalOpen.set(false);
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
  }

  submitForm(): void {
    const fileData = this.selectedFile();
    if (fileData) this.onSave.emit(fileData.file);
  }
}
