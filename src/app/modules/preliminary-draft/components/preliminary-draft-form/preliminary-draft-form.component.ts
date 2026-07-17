import { Component, computed, DestroyRef, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ProposalService } from '../../../proposal/services/proposal.service';
import { UserService } from '../../../users/services/user.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';

import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-preliminary-draft-form',
  templateUrl: './preliminary-draft-form.component.html',
  styleUrls: ['./preliminary-draft-form.component.css'],
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, NgTemplateOutlet, InfoBannerComponent, SearchableSelectComponent]
})
export class PreliminaryDraftFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly destroyRef = inject(DestroyRef);

  preliminaryDraft = input<PreliminaryDraft | null>(null);
  @Output() onSave = new EventEmitter<PreliminaryDraft>();

  readonly form = this.fb.group({
    proposalId: ['', Validators.required],
    title: ['', Validators.required],
    description: ['', Validators.required],
    document: [null as any, Validators.required]
  });

  attachmentState = signal({ hasFile: false, name: null as string | null });
  isUploadModalOpen = signal(false);
  selectedProposalId = signal<string>('');

  protected availableProposals = computed(() => {
    const allProposals = this.proposalService.proposals();
    const currentUser = this.authService.currentUser();
    const existingPreliminaryDrafts = this.preliminaryDraftService.preliminaryDrafts();
    const activePrelimminaryDraft = this.preliminaryDraft();
    return allProposals.filter(proposal => {
      if (activePrelimminaryDraft && proposal.id === activePrelimminaryDraft.proposalId) return true;
      const isApproved =
        proposal.state === stateList.APROBADO ||
        proposal.state === stateList.APROBADO_CON_OBSERVACIONES;
      const isDirector = proposal.director?.id === currentUser?.id;
      const isAlreadyRegistered = existingPreliminaryDrafts.some(draft => draft.proposalId === proposal.id);
      return isApproved && isDirector && !isAlreadyRegistered;
    });
  });

  protected selectedProposal = computed(() => {
    const id = this.selectedProposalId();
    return this.availableProposals().find(proposal => proposal.id === id) || null;
  });

  protected proposalEvaluationDocument = computed(() => {
    const proposal = this.selectedProposal();
    if (!proposal?.evaluations?.length) return null;

    const approvedEvaluation = [...proposal.evaluations]
      .reverse()
      .find(evaluation =>
        evaluation.veredict === stateList.APROBADO ||
        evaluation.veredict === stateList.APROBADO_CON_OBSERVACIONES
      );

    const fileName = approvedEvaluation?.signedDocuments?.[0];

    if (!fileName) return null;

    // Retornamos un objeto estructurado para que el HTML pueda leer .name y .url sin errores
    return {
      name: typeof fileName === 'string' ? fileName : (fileName as any).name,
      url: typeof fileName === 'string' ? '' : (fileName as any).url
    };
  });

  protected proposalOptions = computed<SelectOption[]>(() =>
    this.availableProposals().map(p => ({
      id: p.id!,
      label: p.title
    }))
  );

  ngOnInit(): void {
    const currentPreliminaryDraft = this.preliminaryDraft();
    if (currentPreliminaryDraft) {
      this.initEditMode(currentPreliminaryDraft);
    } else {
      this.initCreateMode();
    }
    this.form.get('proposalId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.selectedProposalId.set(id ?? ''));
  }

  private initEditMode(preliminaryDraft: PreliminaryDraft): void {
    this.selectedProposalId.set(preliminaryDraft.proposalId);
    this.form.patchValue({
      proposalId: preliminaryDraft.proposalId,
      title: preliminaryDraft.proposalData.title,
      description: preliminaryDraft.proposalData.description
    });
    this.form.get('document')?.clearValidators();
    const mainDocument = preliminaryDraft.documents.find(document => document.type === 'Anteproyecto');
    if (mainDocument) {
      this.attachmentState.set({ hasFile: true, name: mainDocument.name });
      this.form.get('document')?.setValue(mainDocument);
    }
    this.form.updateValueAndValidity();
  }

  private initCreateMode(): void {
    this.form.get('title')?.disable();
    this.form.get('description')?.disable();
  }

  get isEditMode(): boolean {
    return !!this.preliminaryDraft();
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.valid && control?.touched);
  }

  getMemberName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(namePart => !!namePart)
      .join(' ');
  }

  getAuthorsNames(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.attachmentState.set({ hasFile: true, name: event.fileName });
    this.form.get('document')?.setValue(event.file);
    this.form.get('document')?.markAsTouched();
    this.isUploadModalOpen.set(false);

    this.showNotification(
      'Archivo adjuntado',
      'El documento del anteproyecto se ha cargado correctamente.',
      NotificationType.CONFIRMATION
    );
  }

  removeFile(): void {
    this.attachmentState.set({ hasFile: false, name: null });
    this.form.get('document')?.setValue(null);
    this.form.get('document')?.markAsTouched();
    this.showNotification(
      'Archivo removido',
      'Se ha quitado el documento adjunto.',
      NotificationType.INFO
    );
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.showNotification(
        'Datos incompletos',
        'Por favor, asegúrese de seleccionar una propuesta y adjuntar el anteproyecto.',
        NotificationType.ERROR
      );
      return;
    }
    const proposal = this.selectedProposal();
    if (!proposal) return;
    const documentToSave = this.mapDocumentObject();
    const result: PreliminaryDraft = {
      ...this.preliminaryDraft(),
      proposalId: proposal.id!,
      proposalData: {
        ...proposal,
        title: (this.isEditMode ? this.form.get('title')?.value : proposal.title) ?? '',
        description: (this.isEditMode ? this.form.get('description')?.value : proposal.description) ?? ''
      },
      documents: documentToSave ? [documentToSave] : (this.preliminaryDraft()?.documents || []),
      state: this.preliminaryDraft()?.state || stateList.EN_REVISION,
      createdData: this.preliminaryDraft()?.createdData || new Date(),
      evaluations: this.preliminaryDraft()?.evaluations || []
    };
    this.onSave.emit(result);
  }

  private mapDocumentObject(): Document | null {
    const preliminaryDraft = this.preliminaryDraft();
    const existingDocument = preliminaryDraft?.documents.find(document => document.type === 'Anteproyecto');
    const currentAttachment = this.attachmentState();
    if (currentAttachment.hasFile && currentAttachment.name === existingDocument?.name) {
      return existingDocument;
    }
    if (currentAttachment.hasFile) {
      return {
        id: crypto.randomUUID(),
        name: currentAttachment.name!,
        url: '',
        uploadDate: new Date().toLocaleDateString('es-ES').replaceAll('/', ' - '),
        type: DocumentType.ANTEPROYECTO,
        status: stateList.EN_REVISION
      };
    }
    return null;
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
