import { Component, computed, DestroyRef, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { User } from '../../../users/interfaces/user.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { UserService } from '../../../users/services/user.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { UserRoleType } from '../../../../core/models/user-role';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface SustentationFormPayload {
  sustentationDate: string | Date;
  location: string;
  juror1: string;
  juror2: string;
}

@Component({
  selector: 'app-register-sustentation-form',
  templateUrl: './register-sustentation-form.component.html',
  styleUrls: ['./register-sustentation-form.component.css'],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    FileUploadModalComponent,
    ButtonComponent,
    DatePicker
  ]
})
export class RegisterSustentationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  thesisWork = input.required<ThesisWork>();
  isSubmitting = input<boolean>(false);

  @Output() onSave = new EventEmitter<{ payload: SustentationFormPayload; file: File }>();
  @Output() onBack = new EventEmitter<void>();

  private readonly firstJurorSelectedId = signal<string>('');
  isModalOpen = signal<boolean>(false);
  uploadedFormatE = signal<{ fileName: string; file: File } | null>(null); // 👈 Tipado correcto de la carga de archivos
  isSubmitAttempted = signal<boolean>(false);

  uploadedFileName = computed<string>(() => {
    const fileData = this.uploadedFormatE();
    return fileData ? fileData.fileName : 'Formato_E - Sustentación';
  });

  readonly form = this.fb.group({
    sustentationDate: ['', Validators.required],
    location: ['', Validators.required],
    juror1: ['', Validators.required],
    juror2: ['', Validators.required]
  });

  availableJurors = computed<User[]>(() => {
    const allUsers = this.userService.users();
    const currentWork = this.thesisWork();

    if (!currentWork?.preliminaryDraftData?.proposalData) return [];
    const data = currentWork.preliminaryDraftData.proposalData;

    const forbiddenIds = new Set<string>();
    if (data.director?.id) forbiddenIds.add(data.director.id);
    if (data.codirector?.id) forbiddenIds.add(data.codirector.id);
    if (data.advisor?.id) forbiddenIds.add(data.advisor.id);

    data.authors?.forEach(auth => {
      const id = typeof auth === 'string' ? auth : (auth as User)?.id;
      if (id) forbiddenIds.add(id);
    });

    return allUsers.filter(user => {
      const isDocente = user.roles?.includes(UserRoleType.DOCENTE);
      const isNotParticipant = !forbiddenIds.has(user.id);
      const hasConflictRole = user.roles?.some(role =>
        role === UserRoleType.JEFE_DEP || role === UserRoleType.CONSEJO
      );
      return isDocente && isNotParticipant && !hasConflictRole;
    });
  });

  protected filteredJurorsForJ2 = computed<User[]>(() => {
    const available = this.availableJurors();
    const firstId = this.firstJurorSelectedId();
    return available.filter(user => user.id !== firstId);
  });

  ngOnInit(): void {
    this.setupFormSubscriptions();
  }

  private setupFormSubscriptions(): void {
    this.form.get('juror1')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id: string | null) => {
        const selectedId = id || '';
        this.firstJurorSelectedId.set(selectedId);

        if (this.form.get('juror2')?.value === selectedId) {
          this.form.get('juror2')?.setValue('');
        }
      });
  }

  getMemberFullName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(namePart => !!namePart)
      .join(' ');
  }

  getAuthorsNames(ids: User[] | string[] | undefined): string {
    return this.userService.getAuthorsNames(ids as string[]) || 'No asignado';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(this.isSubmitAttempted() && control?.invalid) || !!(control?.invalid && control?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void { // 👈 Corregido la firma del evento
    this.uploadedFormatE.set(event);
    this.isModalOpen.set(false);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    this.form.markAllAsTouched();

    const currentFile = this.uploadedFormatE();

    if (this.form.invalid || !currentFile) {
      this.notificationService.show({
        title: 'Formulario incompleto',
        message: 'Debe diligenciar todos los campos y adjuntar el Formato_E.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.onSave.emit({
      payload: this.form.value as SustentationFormPayload,
      file: currentFile.file
    });
  }
}
