import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../button-component/button-component.component';
import { UserRole } from '../../../../../core/models/user-role';

@Component({
  selector: 'app-roles-view-modal',
  imports: [DialogModule, CommonModule, ButtonComponent],
  templateUrl: './roles-view-modal.component.html',
  styleUrls: ['./roles-view-modal.component.css']
})
export class RolesViewModalComponent {

  @Input() isOpen: boolean = false;
  @Input() username: string = '';
  @Input() roles: UserRole[] = []; // Recibe la lista filtrada o completa

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onManage = new EventEmitter<void>();

  get activeRoles() {
    return this.roles.filter(r => r.assigned);
  }

  close() {
    this.isOpenChange.emit(false);
  }
}
