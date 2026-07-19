import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { User } from '../../interfaces/user.interface';

@Injectable({ providedIn: 'root' })
export class UserFormFacadeService {
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // =====================================
  // OBTENER USUARIO
  // =====================================
  public getUserById(id: string): Observable<User | undefined> {
    return this.userService.getUserByIdMock(id);
  }

  public handleNotFound(message: string = 'Usuario no encontrado'): void {
    this.showNotification('Atención', message, NotificationType.ERROR);
    this.router.navigate(['/users']);
  }

  // =====================================
  // CREAR USUARIO
  // =====================================
  public createUser(userData: User, onSuccess: () => void): void {
    this.showNotification('Procesando registro', 'Estamos procesando la información del usuario...', NotificationType.INFO);

    this.userService.createUserMock(userData).subscribe({
      next: () => {
        this.showNotification('Usuario registrado', 'El usuario ha sido registrado correctamente.', NotificationType.CONFIRMATION);
        onSuccess();
        this.router.navigate(['/users']);
      },
      error: (err) => {
        console.error('Error en la creación:', err);
        this.showNotification('Error de servidor', 'No se pudo guardar el usuario. Intente nuevamente.', NotificationType.ERROR);
      }
    });
  }

  // =====================================
  // ACTUALIZAR USUARIO (NUEVO)
  // =====================================
  public updateUser(id: string, userData: User, onSuccess: () => void, onError: () => void): void {
    this.showNotification('Procesando actualización', 'Estamos procesando la actualización de la información del usuario...', NotificationType.INFO);

    this.userService.updateUserMock(id, userData).subscribe({
      next: () => {
        this.showNotification('¡Actualización exitosa!', 'Los datos del usuario han sido modificados correctamente.', NotificationType.CONFIRMATION);
        onSuccess();
        this.router.navigate(['/users']);
      },
      error: (err) => {
        console.error('Error en la actualización:', err);
        this.showNotification('Error de actualización', 'No se pudo guardar la información. Intente de nuevo', NotificationType.ERROR);
        onError();
      }
    });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
