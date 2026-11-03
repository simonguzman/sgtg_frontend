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
  @Input() username: string = '';
  @Input() roles: UserRole[] = [];
  /** false si solo se consultan los roles */
  @Input() canManage = true;

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onManage = new EventEmitter<void>();

  get activeRoles() {
    return this.roles.filter(r => r.assigned);
  }

  close() {
    this.isOpenChange.emit(false);
  }
}
