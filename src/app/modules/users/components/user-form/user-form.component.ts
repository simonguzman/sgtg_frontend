import { Component, DestroyRef, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../interfaces/user.interface';
import { CatalogItem } from '../../interfaces/catalog-item.interface';
import { UserRole } from '../../../../core/models/user-role';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../enum/identification-type.enum';
import { CONTRACT_TYPE_LABELS, ContractType } from '../../enum/contract-type.enum';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { RolesSelectionModalComponent } from '../../../../shared/components/modals/roles/roles-selection-modal/roles-selection-modal.component';
import { CatalogSelectionModalComponent } from '../../../../shared/components/modals/catalog-selection-modal/catalog-selection-modal.component';
import { InlineNoticeComponent } from '../../../../shared/components/inline-notice/inline-notice.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { CatalogApiService } from '../../../../core/services/catalog/catalog-api.service';
import { requiresProgram, requiresTeacherProfile } from '../../../../core/mappers/usuario.mapper';
import { apiErrorMessage } from '../../../../core/utils/api-error.utils';

/** Longitud mínima de la contraseña (igual que en el backend). */
export const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, ButtonComponent, RolesSelectionModalComponent, CatalogSelectionModalComponent,
    InlineNoticeComponent],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent  {
  fb = inject(FormBuilder);
  protected notificationService = inject(NotificationService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly identificationTypes = Object.values(IdentificationType);
  /** Vinculaciones del negocio (`TipoVinculacion`) */
  readonly contractTypes = Object.values(ContractType).map(value => ({ value, label: CONTRACT_TYPE_LABELS[value] }));
  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  /** Catálogos del backend para el perfil académico */
  readonly departments = signal<CatalogItem[]>([]);
  readonly programs = signal<CatalogItem[]>([]);

  isRolesModalOpen = false;
  currentRolesForModal: UserRole[] = [];
  isDepartmentModalOpen = false;
  isProgramModalOpen = false;
  /** true mientras se crea un departamento o un programa en el catálogo */
  readonly isCreatingCatalogItem = signal(false);
  /** Mostrar la contraseña escrita */
  readonly showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update(visible => !visible);
  }
  /** Departamento al que se adscribe un programa nuevo (se elige en el modal de programas) */
  newProgramDepartmentId: number | null = null;

  user = input<User | null>(null);
  @Output() onSubmit = new EventEmitter <User>();

  userForm = this.fb.group({
    idType: ['', [Validators.required]],
    idNumber: [null as number | null, [Validators.required, Validators.min(0)]],
    firstName: ['', [Validators.required]],
    secondName: [''],
    lastName: ['', [Validators.required]],
    secondLastName: ['', [Validators.required]],
    codeNumber: [null as number | null , [Validators.required, Validators.min(0)]],
    roles: new FormControl<UserRoleType[]>([], {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)]
    }),
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(MIN_PASSWORD_LENGTH)]],
    contractType: [null as ContractType | null],
    departmentId: [null as number | null],
    programId: [null as number | null]
  })

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  constructor() {
    effect(() => {
      this.syncFormWithUser();
    });
    this.userForm.controls.roles.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateProfileValidators());
    this.loadCatalogs();
  }

  private loadCatalogs(): void {
    this.catalogApi.getDepartments().subscribe({
      next: departments => this.departments.set(departments),
      error: () => this.departments.set([])
    });
    this.catalogApi.getPrograms().subscribe({
      next: programs => this.programs.set(programs),
      error: () => this.programs.set([])
    });
  }

  private syncFormWithUser() {
    const userData = this.user();
    const passwordControl = this.userForm.get('password');
    if(userData){
        this.userForm.patchValue({
          ...userData,
          idType: this.toIdentificationLabel(userData.idType),
          password: '',
          contractType: userData.contractType ?? null,
          departmentId: userData.department?.id ?? null,
          programId: userData.program?.id ?? null
        });
        passwordControl?.setValidators([Validators.minLength(MIN_PASSWORD_LENGTH)]);
      } else {
        this.userForm.reset({
        idType: '',
        firstName: '',
        lastName: '',
        secondLastName: '',
        email: '',
        password: '',
        contractType: null,
        departmentId: null,
        programId: null
      });
        passwordControl?.setValidators([Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]);
      }
      passwordControl?.updateValueAndValidity();
      this.updateProfileValidators();
  }

  /**
   * Con un rol de perfil docente son obligatorios la vinculación y el
   * departamento; con el rol de estudiante, el programa.
   */
  private updateProfileValidators(): void {
    const roles = this.userForm.controls.roles.value;
    const docente = requiresTeacherProfile(roles);
    const { contractType, departmentId, programId } = this.userForm.controls;
    contractType.setValidators(docente ? [Validators.required] : []);
    departmentId.setValidators(docente ? [Validators.required] : []);
    programId.setValidators(requiresProgram(roles) ? [Validators.required] : []);
    [contractType, departmentId, programId].forEach(control => control.updateValueAndValidity({ emitEvent: false }));
  }

  /** Acepta la clave (`CC`) o la etiqueta del tipo de documento y devuelve la etiqueta. */
  private toIdentificationLabel(idType: string): string {
    const key = idType as keyof typeof IdentificationType;
    return IdentificationType[key] ?? idType;
  }

  get isEditMode(): boolean {
    return !!this.user();
  }

  /** ¿Los roles elegidos requieren perfil docente (vinculación y departamento)? */
  get showDepartment(): boolean {
    return requiresTeacherProfile(this.userForm.controls.roles.value);
  }

  /** ¿Los roles elegidos requieren programa (perfil de estudiante)? */
  get showProgram(): boolean {
    return requiresProgram(this.userForm.controls.roles.value);
  }

  /** El docente que no es de planta necesita un codirector de planta al dirigir (Art. 6). */
  get requiresCodirectorNotice(): boolean {
    const contractType = this.userForm.controls.contractType.value;
    return !!contractType && contractType !== ContractType.PLANTA;
  }

  submit() {
    if(this.userForm.invalid){
      this.handleInvalidForm();
      return;
    }
    const { departmentId, programId, contractType, ...formValues } = this.userForm.getRawValue();
    const updatedUser: User = {
      ...this.user(),
      ...(formValues as unknown as User),
      contractType: this.showDepartment ? contractType : null,
      department: this.departments().find(department => department.id === Number(departmentId)) ?? null,
      program: this.programs().find(program => program.id === Number(programId)) ?? null
    };
    this.onSubmit.emit(updatedUser);
  }

  get selectedDepartmentName(): string {
    const id = this.userForm.controls.departmentId.value;
    return this.departments().find(department => department.id === id)?.name ?? '';
  }

  get selectedProgramName(): string {
    const id = this.userForm.controls.programId.value;
    return this.programs().find(program => program.id === id)?.name ?? '';
  }

  handleDepartmentSaved(departmentId: number): void {
    this.userForm.controls.departmentId.setValue(departmentId);
    this.userForm.controls.departmentId.markAsTouched();
  }

  handleProgramSaved(programId: number): void {
    this.userForm.controls.programId.setValue(programId);
    this.userForm.controls.programId.markAsTouched();
  }

  /** Crea un departamento en el catálogo; el modal lo deja seleccionado hasta guardar. */
  addDepartment(name: string): void {
    if (!name.trim()) return;
    this.isCreatingCatalogItem.set(true);
    this.catalogApi.createDepartment(name.trim())
      .pipe(finalize(() => this.isCreatingCatalogItem.set(false)))
      .subscribe({
        next: department => this.departments.update(list => [...list, department]),
        error: error => this.notificationService.error('No se creó el departamento',
          apiErrorMessage(error, 'Intente de nuevo.'))
      });
  }

  /**
   * Crea un programa en el catálogo, adscrito al departamento elegido en el
   * modal (su Comité atenderá los trabajos del programa); el modal lo deja
   * seleccionado hasta guardar.
   */
  addProgram(name: string): void {
    if (!name.trim()) return;
    if (this.newProgramDepartmentId === null) {
      this.notificationService.error('No se creó el programa', 'Seleccione el departamento del programa.');
      return;
    }
    this.isCreatingCatalogItem.set(true);
    this.catalogApi.createProgram(name.trim(), this.newProgramDepartmentId)
      .pipe(finalize(() => this.isCreatingCatalogItem.set(false)))
      .subscribe({
        next: program => this.programs.update(list => [...list, program]),
        error: error => this.notificationService.error('No se creó el programa',
          apiErrorMessage(error, 'Intente de nuevo.'))
      });
  }

  private handleInvalidForm() {
    this.userForm.markAllAsTouched();
    this.showErrorNotification();
  }

  private showErrorNotification() {
    return this.notificationService.show({
        title: 'Formulario incorrecto',
        message: 'Por favor, diligencie correctamente todos los campos obligatorios.',
        type: NotificationType.ERROR
    });
  }

  get fullName(): string {
    const { firstName, lastName } = this.userForm.value;
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Usuario';
  }

  get selectedRolesDisplay(): string {
    return this.userForm.controls.roles.value?.join(', ') || '';
  }

  openRolesModal() {
    const currentSelected = this.userForm.controls.roles.value;

    this.currentRolesForModal = Object.values(UserRoleType).map(type => ({
      type: type,
      assigned: currentSelected.includes(type)
    }));

    this.isRolesModalOpen = true;
  }

  handleRolesSaved(updatedRoles: UserRole[]) {
    this.currentRolesForModal = updatedRoles;
    const activeTypes = this.selectedRoleType(updatedRoles);
    this.userForm.get('roles')?.setValue(activeTypes);
    this.userForm.get('roles')?.markAsTouched();
    this.isRolesModalOpen = false;
  }

  private selectedRoleType(roles: UserRole[]){
    return roles
      .filter(role => role.assigned)
      .map(role => role.type);
  }
}
