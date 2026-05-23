import { Component, computed, DestroyRef, EventEmitter, inject, input, Input, Output, signal } from '@angular/core';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { User } from '../../../users/interfaces/user.interface';
import { Document } from '../../../../core/interfaces/Document.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { UserService } from '../../../users/services/user.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { UserRoleType } from '../../../../core/models/user-role';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    DatePicker]
})
export class RegisterSustentationFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs y Outputs
  thesisWork = input.required<ThesisWork>();
  isSubmitting = input<boolean>(false);
  @Output() onSave = new EventEmitter<any>();
  @Output() onBack = new EventEmitter<void>();

  // Estados del componente
  private readonly firstJurorSelectedId = signal<string>('');
  isModalOpen = signal<boolean>(false);
  uploadedFormatE = signal<any | null>(null); // Guardará el archivo subido
  isSubmitAttempted = signal<boolean>(false);

  // Formulario reactivo basado en tu diseño
  readonly form = this.fb.group({
    sustentationDate: ['', Validators.required],
    location: ['', Validators.required],
    juror1: ['', Validators.required],
    juror2: ['', Validators.required]
  });

  // --- Lógica de Filtrado de Jurados ---
  availableJurors = computed(() => {
    const allUsers = this.userService.users();
    const currentWork = this.thesisWork();

    // Navegamos a la data de la propuesta desde el trabajo de grado
    if (!currentWork?.preliminaryDraftData?.proposalData) return [];
    const data = currentWork.preliminaryDraftData.proposalData;

    const forbiddenIds = new Set<string>();
    if (data.director?.id) forbiddenIds.add(data.director.id);
    if (data.codirector?.id) forbiddenIds.add(data.codirector.id);
    if (data.advisor?.id) forbiddenIds.add(data.advisor.id);

    data.authors?.forEach(auth => {
      const id = typeof auth === 'string' ? auth : (auth as any)?.id;
      if (id) forbiddenIds.add(id);
    });

    return allUsers.filter(user => {
      const isDocente = user.roles?.includes(UserRoleType.DOCENTE);
      const isNotParticipant = !forbiddenIds.has(user.id);
      // Evitar que el Jefe de departamento o el Consejo sean jurados si es tu regla de negocio
      const hasConflictRole = user.roles?.some(role =>
        role === UserRoleType.JEFE_DEP || role === UserRoleType.CONSEJO
      );
      return isDocente && isNotParticipant && !hasConflictRole;
    });
  });

  protected filteredJurorsForJ2 = computed(() => {
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

        // Limpiar el jurado 2 si era el mismo que se acaba de seleccionar en el 1
        if (this.form.get('juror2')?.value === selectedId) {
          this.form.get('juror2')?.setValue('');
        }
      });
  }

  // --- Helpers Semánticos ---
  getMemberFullName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(namePart => !!namePart)
      .join(' ');
  }

  getAuthorsNames(ids: any[] | undefined): string {
    // Si tu servicio acepta strings u objetos, pásalo adecuadamente
    return this.userService.getAuthorsNames(ids as string[]) || 'No asignado';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(this.isSubmitAttempted() && control?.invalid) || !!(control?.invalid && control?.touched);
  }

  // --- Acciones de Archivos ---
  handleFileUploaded(file: any): void {
    this.uploadedFormatE.set(file);
    this.isModalOpen.set(false);
  }

  // --- Envío del Formulario ---
  submit(): void {
    this.isSubmitAttempted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.uploadedFormatE()) {
      this.notificationService.show({
        title: 'Formulario incompleto',
        message: 'Debe diligenciar todos los campos y adjuntar el Formato_E.',
        type: NotificationType.ERROR
      });
      return;
    }

    // Enviamos la estructura exacta que tu componente padre necesita mapear
    this.onSave.emit({
      payload: this.form.value,
      file: this.uploadedFormatE()
    });

    // 💡 REMOVEMOS la notificación de éxito de aquí.
    // La página padre (RegisterSustentationPageComponent) ya se encarga de mostrarla
    // en el método processSustentacion() únicamente cuando el servicio responde con éxito.
  }
}
