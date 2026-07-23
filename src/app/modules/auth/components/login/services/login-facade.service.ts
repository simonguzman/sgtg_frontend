import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

@Injectable({ providedIn: 'root' })
export class LoginFacadeService {
  private readonly authService         = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router              = inject(Router);

  /**
   * Redirige a /notifications si el usuario ya tiene sesión activa.
   * Se llama en ngOnInit para evitar que usuarios autenticados
   * accedan de nuevo al formulario de login.
   */
  public checkAlreadyAuthenticated(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/notifications']);
    }
  }

  /**
   * Ejecuta el flujo completo de autenticación:
   * notificaciones, navegación y manejo de errores.
   * El componente solo actualiza su estado de carga mediante callbacks.
   */
  public login(
    credentials: { email: string; password: string },
    onStart:    () => void,
    onComplete: () => void
  ): void {
    onStart();
    this.authService.login(credentials).subscribe({
      next: (response) => {
        onComplete();
        if (response.success) {
          this.showNotification('¡Bienvenido!', 'Sesión iniciada correctamente.', NotificationType.CONFIRMATION);
          this.router.navigate(['/notifications']);
        } else {
          this.showNotification('Error', response.message || 'Credenciales inválidas', NotificationType.ERROR);
        }
      },
      error: (err) => {
        onComplete();
        console.error('Error en el flujo de login', err);
        this.showNotification('Error del Sistema', 'Ocurrió un error técnico al intentar conectar.', NotificationType.SECURITY);
      }
    });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
