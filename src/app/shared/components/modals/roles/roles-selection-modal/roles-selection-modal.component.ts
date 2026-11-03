import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { UserRole } from '../../../../../core/models/user-role';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../button-component/button-component.component';

@Component({
  selector: 'app-roles-selection-modal',
  imports: [DialogModule, CommonModule, ButtonComponent],
  templateUrl: './roles-selection-modal.component.html',
  styleUrls: ['./roles-selection-modal.component.css']
})
export class RolesSelectionModalComponent implements OnChanges {

  /**
   * Si la ventana está abierta. El p-dialog se crea la primera vez que se abre ({@link yaSeAbrio}): las
   * páginas tienen varias ventanas que casi nunca se abren y crearlas todas al cargar hacía más lenta la página.
   */
  @Input() set isOpen(valor: boolean) {
    this._isOpen = valor;
    if (valor) this.yaSeAbrio = true;
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _isOpen = false;
  /** Se abrió al menos una vez: desde entonces el p-dialog existe (y se conserva para la animación de cierre). */
  yaSeAbrio = false;
  @Input() roles: UserRole[] = [];

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSaved = new EventEmitter<UserRole[]>();

  editableRoles: UserRole[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.initializeRoles();
    }
  }

  initializeRoles() {
    if (!this.roles || this.roles.length === 0) {
      this.editableRoles = Object.values(UserRoleType).map(role => ({
        type: role,
        assigned: false
      }));
    } else {
      this.editableRoles = this.roles.map(role => ({ ...role }));
    }
  }

  toggleRole(role: UserRole) {
    if (role.locked) return;
    role.assigned = !role.assigned;
  }

  save() {
    this.onSaved.emit(this.editableRoles);
    this.isOpenChange.emit(false);
  }

  close() {
    this.isOpenChange.emit(false);
  }

}
