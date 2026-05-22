import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProposalService } from '../../services/proposal.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../interfaces/proposal.interface';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-proposal-details-page',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './proposal-details-page.component.html',
  styleUrls: ['./proposal-details-page.component.css']
})
export class ProposalDetailsPageComponent implements OnInit {
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService)
  private readonly notificationService = inject(NotificationService);

  proposal = signal<Proposal | null>(null);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    if (!id) {
      this.handleNavigationError();
      return;
    }

    this.proposalService.getProposalByIdMock(id).subscribe({
      next: (data) => {
        if (data) {
          this.proposal.set(data);
        } else {
          this.showNotFoundNotification();
          this.router.navigate(['/proposal']);
        }
      },
      error: (err) =>{
        this.showErrorNotification();
        this.router.navigate(['/proposal']);
        console.error(err);
      }
    });
  }

  getMemberName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [
      user.firstName,
      user.secondName,
      user.lastName,
      user.secondLastName
    ].filter(name => !!name).join(' ');
  }

  getAuthors(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  private handleNavigationError(): void {
    this.showIdProposalNotFoundNotification()
    this.router.navigate(['/proposal']);
  }

  private showIdProposalNotFoundNotification(){
    this.notificationService.show({
      title: 'Acceso inválido',
      message: 'No se proporcionó un identificador válido para ver la propuesta.',
      type: NotificationType.ERROR
    });
  }

  private showNotFoundNotification() {
    this.notificationService.show({
      title: 'Propuesta no encontrada',
      message: 'No se pudo encontrar la información de la propuesta solicitada.',
      type: NotificationType.ERROR
    });
  }

  private showErrorNotification() {
    this.notificationService.show({
      title: 'Error de comunicación',
      message: 'Hubo un problema al conectar con el servidor. Intente más tarde.',
      type: NotificationType.ERROR
    });
  }
}
