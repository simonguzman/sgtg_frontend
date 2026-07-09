import { Component, computed, DestroyRef, effect, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { Proposal } from '../../interfaces/proposal.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../core/enums/state.enum';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { UserService } from '../../../users/services/user.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserRoleType } from '../../../../core/models/user-role';
import { ProposalService } from '../../services/proposal.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { UserState } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-proposal-form',
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
  templateUrl: './proposal-form.component.html',
  styleUrls: ['./proposal-form.component.css']
})
export class ProposalFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  proposal = input<Proposal | null>(null);
  @Output() onSubmit = new EventEmitter<Proposal>();

  proposalForm = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    modality: ['', Validators.required],
    student1: ['', Validators.required],
    student2: [''],
    codirector: [''],
    advisor: [''],
    document: [null as File | null]
  });

  private readonly selectedStudent1Id = signal<string>('');
  attachedFile = { hasFile: false, name: null as string | null };
  uploadModalOpen = false;

  protected availableTeachers = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;

    return this.userService.teachers().filter(teacher =>
      teacher.state === UserState.active && teacher.id != currentUserId
    )
  });

  protected availableAdvisors = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;

    return this.userService.advisors().filter(advisor =>
      advisor.state === UserState.active && advisor.id !== currentUserId
    );
  });

  protected availableStudents = computed(() => {
    // Primero filtramos solo los estudiantes activos
    const activeStudents = this.userService.students().filter(student => student.state === UserState.active);
    const allProposals = this.proposalService.proposals();
    const current = this.proposal();

    return activeStudents.filter(student => {
      const pWithStudent = allProposals.find(proposal => proposal.authors.some(author => author.id === student.id));
      return !pWithStudent || (current ? pWithStudent.id === current.id : false);
    });
  });

  protected filteredStudentsForS2 = computed(() => {
    const available = this.availableStudents();
    return available.filter(student => student.id !== this.selectedStudent1Id());
  });

  constructor() {
    effect(() => this.syncFormWithProposal());
  }

  ngOnInit(): void {
    this.setupDynamicLogic();
  }

  private setupDynamicLogic(): void {
    this.proposalForm.get('modality')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(modality => {
        const advisorControl = this.proposalForm.get('advisor');
        if (modality === 'Practica profesional') {
          advisorControl?.setValidators(Validators.required);
        } else {
          advisorControl?.clearValidators();
          advisorControl?.setValue('');
        }
        advisorControl?.updateValueAndValidity();
      });
    this.proposalForm.get('student1')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        const studentId = id ?? '';
        this.selectedStudent1Id.set(studentId);
        if (this.proposalForm.get('student2')?.value === studentId) {
          this.proposalForm.get('student2')?.setValue('');
        }
      });
  }

  get isEditMode(): boolean { return !!this.proposal(); }

  get showAdvisorField(): boolean {
    return this.proposalForm.get('modality')?.value === 'Practica profesional';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.proposalForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.attachedFile = { hasFile: true, name: event.fileName };
    this.proposalForm.get('document')?.setValue(event.file);
    this.proposalForm.get('document')?.markAsTouched();
    this.uploadModalOpen = false;
    this.showNotification('Archivo cargado', 'Documento adjuntado correctamente.', NotificationType.CONFIRMATION);
  }

  removeFile(): void {
    this.attachedFile = { hasFile: false, name: null };
    this.proposalForm.get('document')?.setValue(null);
    this.proposalForm.get('document')?.markAsTouched();
  }

  submit(): void {
    this.proposalForm.markAllAsTouched();

    if (this.proposalForm.invalid) {
      this.showNotification('Formulario incorrecto', 'Diligencie todos los campos obligatorios.', NotificationType.ERROR);
      return;
    }

    if (!this.isEditMode && !this.attachedFile.hasFile) {
      this.showNotification('Archivo requerido', 'Debe adjuntar el formato de propuesta.', NotificationType.ERROR);
      return;
    }

    const currentDirector = this.authService.currentUser();
    if (!currentDirector) {
      this.showNotification('Sesión no encontrada', 'No se pudo identificar al director.', NotificationType.ERROR);
      return;
    }

    this.processSubmit(currentDirector);
  }

  private processSubmit(director: any): void {
    const raw = this.proposalForm.getRawValue();
    if (raw.codirector) this.userService.addRoleToUser(raw.codirector, UserRoleType.CODIRECTOR);

    const authorsArray = this.userService.students().filter(student =>
      student.id === raw.student1 ||
      student.id === raw.student2
    );

    const result: Proposal = {
      ...(this.proposal() ?? {}),
      title: raw.title!,
      description: raw.description!,
      modality: raw.modality!,
      authors: authorsArray,
      director: director,
      codirector: this.availableTeachers().find(teacher => teacher.id === raw.codirector),
      advisor: this.availableAdvisors().find(advisor => advisor.id === raw.advisor),
      state: this.proposal()?.state ?? stateList.EN_REVISION,
      createdAt: this.proposal()?.createdAt ?? new Date(),
      documents: this.mapDocuments(),
      evaluations: this.proposal()?.evaluations ?? []
    } as Proposal;

    this.onSubmit.emit(result);
  }

  private syncFormWithProposal(): void {
    const proposal = this.proposal();
    if (proposal) {
      this.initEditForm(proposal);
    } else {
      this.initCreateForm();
    }
    this.proposalForm.get('document')?.updateValueAndValidity();
  }

  private initEditForm(proposal: Proposal): void {
    this.proposalForm.get('document')?.clearValidators();
    const s1 = proposal.authors[0]?.id ?? '';
    this.selectedStudent1Id.set(s1);

    this.proposalForm.patchValue({
      title: proposal.title,
      description: proposal.description,
      modality: proposal.modality,
      codirector: proposal.codirector?.id ?? '',
      student1: s1,
      student2: proposal.authors[1]?.id ?? '',
      advisor: proposal.advisor?.id ?? ''
    });

    this.attachedFile = {
      hasFile: proposal.documents.length > 0,
      name: proposal.documents[0]?.name ?? null
    };
  }

  private initCreateForm(): void {
    this.proposalForm.get('document')?.setValidators([Validators.required]);
    this.proposalForm.reset({ modality: '', student1: '', student2: '', codirector: '', advisor: '' });
    this.selectedStudent1Id.set('');
    this.attachedFile = { hasFile: false, name: null };
  }

  private mapDocuments(): Document[] {
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

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
