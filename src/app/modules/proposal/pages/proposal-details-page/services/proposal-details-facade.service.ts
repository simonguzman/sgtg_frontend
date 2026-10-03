import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ProposalService } from '../../../services/proposal.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';

@Injectable({ providedIn: 'root' })
export class ProposalDetailsFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  public load(
    id: string,
    onSuccess:  (proposal: Proposal) => void,
    onNotFound: () => void,
    onError: () => void
  ): void {
    this.proposalService.getProposalByIdMock(id).subscribe({
      next: (data) => {
        if (data) {
          onSuccess(data);
        } else {
          this.showNotification(
            'Propuesta no encontrada',
            'No se pudo encontrar la información de la propuesta solicitada.',
            NotificationType.ERROR
          );
          onNotFound();
        }
      },
      error: (err) => {
        console.error(err);
        this.showNotification(
          'Error de comunicación',
          'Hubo un problema al conectar con el servidor. Intente más tarde.',
          NotificationType.ERROR
        );
        onError();
      }
    });
  }

  public handleMissingId(onNavigate: () => void): void {
    this.showNotification(
      'Acceso inválido',
      'No se proporcionó un identificador válido para ver la propuesta.',
      NotificationType.ERROR
    );
    onNavigate();
  }

  public goBack(): void {
    const currentUrl = this.router.url;
    this.router.navigate([currentUrl.includes('/history') ? '/history' : '/proposal']);
  }

  public getMemberName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(Boolean)
      .join(' ');
  }

  public getAuthors(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
