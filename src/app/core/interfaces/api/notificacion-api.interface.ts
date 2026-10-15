import { ProcesoApi } from './trabajo-grado-api.interface';

/** Relevancia de la notificación (`TipoNotificacion` del backend). */
export type TipoNotificacionApi = 'INFO' | 'CONFIRMACION' | 'ALERTA' | 'ERROR';

/** Notificación del buzón del usuario autenticado (`NotificacionDTOResponse`). */
export interface NotificacionApi {
  id: number;
  tipo: TipoNotificacionApi;
  titulo: string;
  mensaje: string;
  trabajoId: number | null;
  /** Etapa del trabajo al notificar: define a qué vista lleva la notificación */
  etapa: ProcesoApi | null;
  fecha: string;
  leida: boolean;
}
