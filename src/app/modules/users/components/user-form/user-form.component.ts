import { Component, DestroyRef, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../interfaces/user.interface';
import { CatalogItem } from '../../interfaces/catalog-item.interface';
import { UserRole } from '../../../../core/models/user-role';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../enum/identification-type.enum';
import { CONTRACT_TYPE_LABELS, ContractType } from '../../enum/contract-type.enum';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { RolesSelectionModalComponent } from '../../../../shared/components/modals/roles/roles-selection-modal/roles-selection-modal.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { CatalogApiService } from '../../../../core/services/catalog/catalog-api.service';
import { contractTypeForRoles, requiresDepartment, requiresProgram } from '../../../../core/mappers/usuario.mapper';
import { apiErrorMessage } from '../../../../core/utils/api-error.utils';

/** Longitud mínima de la contraseña (igual que en el backend). */
export const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, ButtonComponent, RolesSelectionModalComponent],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent  {
  fb = inject(FormBuilder);
  protected notificationService = inject(NotificationService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly identificationTypes = Object.values(IdentificationType);
  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  /** Catálogos del backend para el perfil académico */
  readonly departments = signal<CatalogItem[]>([]);
  readonly programs = signal<CatalogItem[]>([]);

  isRolesModalOpen = false;
  currentRolesForModal: UserRole[] = [];

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
        departmentId: null,
        programId: null
      });
        passwordControl?.setValidators([Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]);
      }
      passwordControl?.updateValueAndValidity();
      this.updateProfileValidators();
  }

  /** El departamento es obligatorio para director/codirector y el programa para estudiantes. */
  private updateProfileValidators(): void {
    const roles = this.userForm.controls.roles.value;
    const department = this.userForm.controls.departmentId;
    const program = this.userForm.controls.programId;
    department.setValidators(requiresDepartment(roles) ? [Validators.required] : []);
    program.setValidators(requiresProgram(roles) ? [Validators.required] : []);
    department.updateValueAndValidity({ emitEvent: false });
    program.updateValueAndValidity({ emitEvent: false });
  }

  /** Acepta la clave (`CC`) o la etiqueta del tipo de documento y devuelve la etiqueta. */
  private toIdentificationLabel(idType: string): string {
    const key = idType as keyof typeof IdentificationType;
    return IdentificationType[key] ?? idType;
  }

  get isEditMode(): boolean {
    return !!this.user();
  }

  /** ¿Los roles elegidos requieren departamento (perfil docente)? */
  get showDepartment(): boolean {
    return requiresDepartment(this.userForm.controls.roles.value);
  }

  /** ¿Los roles elegidos requieren programa (perfil de estudiante)? */
  get showProgram(): boolean {
    return requiresProgram(this.userForm.controls.roles.value);
  }

  /** Vinculación que se registrará según los roles (el formulario no la pregunta). */
  get contractTypeDescription(): string {
    const contractType = contractTypeForRoles(this.userForm.controls.roles.value);
    if (!contractType) return '';
    // Solo el docente ocasional necesita un codirector de planta (Art. 6)
    const requiresCodirector = contractType === ContractType.OCASIONAL
      ? 'requiere un codirector de planta del mismo departamento al dirigir'
      : 'no requiere codirector';
    return `${CONTRACT_TYPE_LABELS[contractType]} (${requiresCodirector})`;
  }

  submit() {
    if(this.userForm.invalid){
      this.handleInvalidForm();
      return;
    }
    const { departmentId, programId, ...formValues } = this.userForm.getRawValue();
    const updatedUser: User = {
      ...this.user(),
      ...(formValues as unknown as User),
      department: this.departments().find(department => department.id === Number(departmentId)) ?? null,
      program: this.programs().find(program => program.id === Number(programId)) ?? null
    };
    this.onSubmit.emit(updatedUser);
  }

  /** Crea un departamento en el catálogo y lo deja seleccionado. */
  addDepartment(name: string): void {
    if (!name.trim()) return;
    this.catalogApi.createDepartment(name.trim()).subscribe({
      next: department => {
        this.departments.update(list => [...list, department]);
        this.userForm.controls.departmentId.setValue(department.id);
      },
      error: error => this.notificationService.error('No se creó el departamento',
        apiErrorMessage(error, 'Intente de nuevo.'))
    });
  }

  /** Crea un programa en el catálogo y lo deja seleccionado. */
  addProgram(name: string): void {
    if (!name.trim()) return;
    this.catalogApi.createProgram(name.trim()).subscribe({
      next: program => {
        this.programs.update(list => [...list, program]);
        this.userForm.controls.programId.setValue(program.id);
      },
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
