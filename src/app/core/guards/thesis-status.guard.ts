import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ThesisWorkService } from '../../modules/thesis-work/services/thesis-work.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { stateList } from '../enums/state.enum';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';


export const thesisRestrictedStatusGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const thesisWorkService = inject(ThesisWorkService);
  const notificationService = inject(NotificationService);

  // Buscar el ID del trabajo en la ruta actual o en el padre
  const id = route.paramMap.get('id') || route.parent?.paramMap.get('id');

  if (!id) {
    return true; // Si no hay ID, dejamos que el componente maneje el error de "No encontrado"
  }

  // Obtenemos los trabajos actuales de la señal
  const currentWork = thesisWorkService.thesisWorks().find(w => w.thesisWorkId === id);

  if (currentWork) {
    // Verificamos si tiene un estado restrictivo
    if (currentWork.state === stateList.CANCELADO || currentWork.state === stateList.SUSPENDIDO) {

      notificationService.show({
        title: 'Acceso Restringido',
        message: `La acción no está permitida porque el trabajo de grado se encuentra ${currentWork.state}.`,
        type: NotificationType.ERROR
      });

      // Bloqueamos la navegación y redirigimos al dashboard de documentos o a la lista general
      // Ajusta esta ruta a donde quieras devolver al usuario
      return router.createUrlTree(['/rutas/lista-trabajos']);
    }
  }
  return true;
};
