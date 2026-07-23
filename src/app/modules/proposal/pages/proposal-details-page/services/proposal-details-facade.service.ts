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
  private readonly proposalService     = inject(ProposalService);
  private readonly userService         = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly router              = inject(Router);

  /**
   * Carga la propuesta por ID y delega el resultado al componente mediante callbacks.
   * Las notificaciones de error se manejan aquí — el componente solo reacciona
   * actualizando su signal o navegando según el resultado.
   */
  public load(
    id: string,
    onSuccess:  (proposal: Proposal) => void,
    onNotFound: () => void,
    onError:    () => void
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

  /**
   * Notifica que no se recibió un ID válido en la ruta y ejecuta la navegación
   * de respaldo que el componente decida.
   */
  public handleMissingId(onNavigate: () => void): void {
    this.showNotification(
      'Acceso inválido',
      'No se proporcionó un identificador válido para ver la propuesta.',
      NotificationType.ERROR
    );
    onNavigate();
  }

  /**
   * Navega hacia atrás de forma contextual: si la URL contiene '/history'
   * vuelve al listado del historial; de lo contrario, al listado de propuestas.
   * Esta lógica de contexto pertenece a la fachada — el componente no debe
   * saber de dónde vino el usuario.
   */
  public goBack(): void {
    const currentUrl = this.router.url;
    this.router.navigate([currentUrl.includes('/history') ? '/history' : '/proposal']);
  }

  /** Formatea el nombre completo de un participante filtrando campos vacíos. */
  public getMemberName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(Boolean)
      .join(' ');
  }

  /** Delega en UserService para obtener la cadena de nombres de autores. */
  public getAuthors(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
