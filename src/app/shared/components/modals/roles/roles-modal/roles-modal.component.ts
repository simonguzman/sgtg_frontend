import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { RolesSelectionModalComponent } from '../roles-selection-modal/roles-selection-modal.component';
import { UserRole } from '../../../../../core/models/user-role';
import { RolesViewModalComponent } from '../roles-view-modal/roles-view-modal.component';

@Component({
  selector: 'app-roles-modal',
  imports: [CommonModule, RolesViewModalComponent, RolesSelectionModalComponent],
  templateUrl: './roles-modal.component.html',
  styleUrls: ['./roles-modal.component.css']
})
export class RolesModalComponent {

  @Input() isOpen: boolean = false;
  @Input() username: string = '';
  @Input() roles: UserRole[] = [];

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSaved = new EventEmitter<UserRole[]>();

  isEditing: boolean = false;

  toggleEditing(value: boolean) {
    this.isEditing = value;
  }

  handleSave(updatedRoles: UserRole[]) {
    this.onSaved.emit(updatedRoles);
    this.closeAll();
  }

  closeAll() {
    this.isEditing = false;
    this.isOpenChange.emit(false);
  }
}
