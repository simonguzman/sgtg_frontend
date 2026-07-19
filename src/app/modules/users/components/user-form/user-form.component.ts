import { Component, effect, EventEmitter, inject, input, Output } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../interfaces/user.interface';
import { UserRole } from '../../../../core/models/user-role';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { RolesSelectionModalComponent } from '../../../../shared/components/modals/roles/roles-selection-modal/roles-selection-modal.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, ButtonComponent, RolesSelectionModalComponent],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent  {
  fb = inject(FormBuilder);
  protected notificationService = inject(NotificationService);

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
    password: ['', [Validators.minLength(6)]]
  })

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  constructor() {
    effect(() => {
      this.syncFormWithUser();
    });
  }

  private syncFormWithUser() {
    const userData = this.user();
    const passwordControl = this.userForm.get('password');
    if(userData){
        this.userForm.patchValue(userData);
        passwordControl?.setValidators([Validators.minLength(6)]);
      } else {
        this.userForm.reset({
        idType: '',
        firstName: '',
        lastName: '',
        secondLastName: '',
        email: '',
        password: ''
      });
        passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      }
      passwordControl?.updateValueAndValidity();
  }

  get isEditMode(): boolean {
    return !!this.user();
  }

  submit() {
    if(this.userForm.invalid){
      this.handleInvalidForm();
      return;
    }
    const updatedUser: User = {
      ...this.user(),
      ...(this.userForm.getRawValue() as User)
    };
    this.onSubmit.emit(updatedUser);
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
    this.isRolesModalOpen = false;
  }

  private selectedRoleType(roles: UserRole[]){
    return roles
      .filter(role => role.assigned)
      .map(role => role.type);
  }
}
