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
  /**
   * Hecho que la generó (`EventoTrabajoGrado`, ej. `DECISION_COMITE`); algunos
   * llevan a una vista propia. Null en las notificaciones anteriores a este dato.
   */
  evento?: string | null;
  /** Sesión de sustentación a la que se refiere (ej. la que se calificó); null si no aplica */
  sesion?: number | null;
  fecha: string;
  leida: boolean;
}
