import { Component, EventEmitter, inject, Input, Output, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';

import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-review-presentations-faculty-council-form',
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent, DatePicker, NgTemplateOutlet],
  templateUrl: './review-presentations-faculty-council-form.component.html',
  styleUrls: ['./review-presentations-faculty-council-form.component.css']
})
export class ReviewPresentationsFacultyCouncilFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) preliminaryDraft!: PreliminaryDraft;
  @Input() isSubmitting = false;

  @Output() onSaveEvaluation = new EventEmitter<{ formValues: any, file: File }>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  uploadedSignedFile = signal<{ fileName: string; file: File } | null>(null);
  isUploadModalOpen = signal(false);

  readonly evaluationForm = this.fb.group({
    result: ['', Validators.required],
    comments: ['', Validators.required],
    maximumDeliveryDate: [null],
    document: [null]
  });

  ngOnInit(): void {
    // 1. Escucha reactiva para validación condicional de la fecha límite
    this.evaluationForm.get('result')?.valueChanges.subscribe(value => {
      const dateControl = this.evaluationForm.get('maximumDeliveryDate');

      if (value === 'Aprobado') {
        dateControl?.setValidators([Validators.required]);
      } else {
        dateControl?.clearValidators();
        dateControl?.setValue(null);
      }
      dateControl?.updateValueAndValidity();
    });

    // 2. CORRECCIÓN: Fuente de verdad única para el estado del formulario en modo lectura
    if (this.isReadOnly) {
      this.evaluationForm.disable();
    }
  }

  get isReadOnly(): boolean {
    return this.preliminaryDraft.state === stateList.APROBADO;
  }

  get signedProposalDocument(): FileDocument | undefined {
    const proposal = this.preliminaryDraft.proposalData;
    if (!proposal?.evaluations?.length) return undefined;

    const approvedEvaluation = [...proposal.evaluations]
      .reverse()
      .find(evaluation =>
        evaluation.veredict === stateList.APROBADO ||
        evaluation.veredict === stateList.APROBADO_CON_OBSERVACIONES
      );

    const fileName = approvedEvaluation?.signedDocuments?.[0];
    if (!fileName) return undefined;

    return {
      id: crypto.randomUUID(),
      name: fileName,
      url: '',
      uploadDate: new Date().toLocaleDateString(),
      type: DocumentType.FORMATO_C,
      status: stateList.APROBADO
    };
  }

  get approvedPreliminaryDraftDocument(): FileDocument | undefined {
    return this.preliminaryDraft.documents.find(document =>
      document.type === 'Anteproyecto' || document.type === 'Correccion'
    );
  }

  get presentationDocument(): FileDocument | undefined {
    return this.preliminaryDraft.documents.find(doc => doc.type === DocumentType.FORMATO_C);
  }

  get evaluationFiles() {
    return this.preliminaryDraft.evaluations
      .filter(evaluation => evaluation.veredict === stateList.APROBADO)
      .map(evaluation => ({
        name: evaluation.signedDocuments?.[0] || 'Evaluación firmada',
        evaluator: evaluation.evaluatorName
      }));
  }

  get documentUploadDate(): string {
    const firstDocument = this.preliminaryDraft.documents[0];
    const rawDate = firstDocument?.uploadDate;

    if (!rawDate) return 'No disponible';
    if (rawDate instanceof Date) {
      return rawDate.toLocaleDateString('es-ES');
    }

    const cleanDateStr = rawDate.replace(/\s+/g, '');
    const standardDate = new Date(cleanDateStr);
    if (!isNaN(standardDate.getTime())) {
      return standardDate.toLocaleDateString('es-ES');
    }

    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const day = +parts[0];
      const month = +parts[1] - 1;
      const year = +parts[2];

      const manualDate = new Date(year, month, day);
      if (!isNaN(manualDate.getTime())) {
        return manualDate.toLocaleDateString('es-ES');
      }
    }

    return 'Fecha inválida';
  }

  getStudentNames(): string {
    return this.userService.getAuthorsNames(this.preliminaryDraft.proposalData.authors);
  }

  getDirectorName(): string {
    return this.userService.getUserFullName(this.preliminaryDraft.proposalData.director.id);
  }

  getCodirectorName(): string {
    const codirector = this.preliminaryDraft.proposalData.codirector;
    return codirector && codirector.id ? this.userService.getUserFullName(codirector.id) : '';
  }

  getAdvisorName(): string {
    const advisor = this.preliminaryDraft.proposalData.advisor;
    return advisor && advisor.id ? this.userService.getUserFullName(advisor.id) : '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.evaluationForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedSignedFile.set(event);
    this.isUploadModalOpen.set(false);
  }

  submit(): void {
    const fileData = this.uploadedSignedFile();
    if (this.evaluationForm.invalid || !fileData) {
      this.evaluationForm.markAllAsTouched();
      this.showValidationErrorNotification(!fileData);
      return;
    }
    this.onSaveEvaluation.emit({
      formValues: this.evaluationForm.value,
      file: fileData.file
    });
  }

  private showValidationErrorNotification(missingFile: boolean): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: missingFile
        ? 'Es obligatorio adjuntar el documento de evaluación firmado.'
        : 'Por favor, complete todos los campos requeridos antes de continuar.',
      type: NotificationType.ERROR
    });
  }
}
