import { Component, inject, OnInit, signal } from '@angular/core';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { ActivatedRoute } from '@angular/router';
import { User } from '../../interfaces/user.interface';
import { Location } from '@angular/common';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { UserFormFacadeService } from '../services/user-form-facade.service';
@Component({
  selector: 'app-user-edit-page',
  standalone: true,
  imports: [ UserFormComponent, ConfirmationActionModalComponent ],
  templateUrl: './user-edit-page.component.html',
  styleUrls: ['./user-edit-page.component.css']
})
export class UserEditPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly facade = inject(UserFormFacadeService);

  userToEdit = signal<User | null>(null);
  isConfirmModalOpen = false;
  private pendingUpdateData: User | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUserData(id);
    } else {
      this.facade.handleNotFound();
    }
  }

  private loadUserData(id: string): void {
    this.facade.getUserById(id).subscribe({
        next: (userFound) => userFound ? this.userToEdit.set(userFound) : this.facade.handleNotFound(),
        error: () => this.facade.handleNotFound('Error al conectar con el servidor')
      });
  }

  handleUpdate(updatedData: User): void {
    this.pendingUpdateData = updatedData;
    this.isConfirmModalOpen = true;
  }

  confirmUpdate(): void {
    const id = this.userToEdit()?.id;
    if (!id || !this.pendingUpdateData) return;

    this.isConfirmModalOpen = false;

    this.facade.updateUser(
      id,
      this.pendingUpdateData,
      () => { this.pendingUpdateData = null; },
      () => { this.isConfirmModalOpen = false; }
    );
  }

  cancelUpdate(): void {
    this.isConfirmModalOpen = false;
    this.pendingUpdateData = null;
  }

  goBack(): void {
    this.location.back();
  }
}
