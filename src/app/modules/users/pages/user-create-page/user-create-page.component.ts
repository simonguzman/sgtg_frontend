import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { User } from '../../interfaces/user.interface';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { UserFormFacadeService } from '../services/user-form-facade.service';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';

@Component({
  selector: 'app-user-create-page',
  standalone: true,
  imports: [UserFormComponent, ConfirmationActionModalComponent],
  templateUrl: './user-create-page.component.html',
  styleUrls: ['./user-create-page.component.css']
})
export class UserCreatePageComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  protected readonly facade = inject(UserFormFacadeService);

  isConfirmModalOpen = false;
  pendingUserData: User | null = null;

  handleCreateUser(userData: User): void {
    this.pendingUserData = userData;
    this.isConfirmModalOpen = true;
  }

  cancelCreation(): void {
    this.isConfirmModalOpen = false;
    this.pendingUserData = null;
  }

  confirmCreation(): void {
    if (!this.pendingUserData) return;
    this.isConfirmModalOpen = false;
    this.facade.createUser(this.pendingUserData, () => {
      this.pendingUserData = null;
    });
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['/users']));
  }
}
