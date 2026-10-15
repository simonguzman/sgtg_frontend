import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import {
  CambioEtapaApi, ETAPAS_FINALES, MotivoCierreApi, ProcesoApi, TrabajoGradoResponse
} from '../../../core/interfaces/api/trabajo-grado-api.interface';

/**
 * Roles que consultan todo el historial. Los demás solo ven los trabajos en
 * los que fueron estudiantes, director, codirector o asesor (los evaluadores
 * y jurados no acceden al historial).
 */
export const ROLES_HISTORIAL_GENERAL: readonly UserRoleType[] = [
  UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.CONSEJO, UserRoleType.JEFE_DEP,
  UserRoleType.DECANATURA
];

/** @returns true si el trabajo está archivado (cerrado: finalizado, no aprobado o cancelado/anulado) */
export function estaArchivado(trabajo: TrabajoGradoResponse): boolean {
  return ETAPAS_FINALES.includes(trabajo.etapa);
}

/** @returns true si el usuario fue estudiante, director, codirector o asesor del trabajo */
export function participoEnElTrabajo(trabajo: TrabajoGradoResponse, userId: string | undefined): boolean {
  if (!userId) return false;
  const id = Number(userId);
  return trabajo.estudiantes.some(estudiante => estudiante.usuarioId === id)
    || trabajo.director?.usuarioId === id
    || trabajo.codirector?.usuarioId === id
    || trabajo.asesor?.usuarioId === id;
}

/** @returns true si el usuario puede ver el trabajo archivado en el historial */
export function puedeVerArchivado(trabajo: TrabajoGradoResponse, userId: string | undefined,
  accesoGeneral: boolean): boolean {
  return estaArchivado(trabajo) && (accesoGeneral || participoEnElTrabajo(trabajo, userId));
}

/** Cambio de etapa con el que se cerró el trabajo. */
export function cambioDeCierre(trabajo: TrabajoGradoResponse): CambioEtapaApi | undefined {
  return [...trabajo.historial].reverse().find(cambio => ETAPAS_FINALES.includes(cambio.destino));
}

/** Etapa en la que estaba el trabajo cuando se cerró. */
export function etapaDeCierre(trabajo: TrabajoGradoResponse): ProcesoApi {
  return cambioDeCierre(trabajo)?.origen ?? trabajo.etapa;
}

const NOMBRE_ETAPA: Record<ProcesoApi, string> = {
  PROPUESTA: 'Propuesta',
  ANTEPROYECTO: 'Anteproyecto',
  EVALUACION: 'Anteproyecto',
  APROBACION_CONSEJO: 'Anteproyecto',
  EN_CURSO: 'En curso',
  PRORROGA: 'Prórroga',
  SUSPENDIDO: 'Suspendido',
  SUSTENTACION: 'Sustentación',
  APLAZADO: 'Sustentación',
  FINALIZADO: 'Finalizado',
  NO_APROBADO: 'No aprobado',
  CANCELADO: 'Cancelado'
};

export function nombreEtapa(etapa: ProcesoApi): string {
  return NOMBRE_ETAPA[etapa];
}

const MOTIVO_CIERRE: Record<MotivoCierreApi, string> = {
  VENCIMIENTO_PLAZO: 'Vencimiento de plazos',
  SUSTENTACION_NO_APROBADA: 'Sustentación no aprobada',
  INASISTENCIA_SUSTENTACION: 'Inasistencia a la sustentación',
  CANCELACION_ESTUDIANTE: 'Cancelación aprobada por el Consejo',
  CANCELACION_DIRECTOR: 'Cancelación aprobada por el Consejo',
  ANULACION_DIRECTOR: 'Anulado por el director'
};

/** Motivo del cierre para el historial. */
export function motivoDeCierre(trabajo: TrabajoGradoResponse): string {
  if (trabajo.motivoCierre) return MOTIVO_CIERRE[trabajo.motivoCierre];
  return trabajo.etapa === 'FINALIZADO' ? 'Trabajo de grado aprobado' : nombreEtapa(trabajo.etapa);
}

/** Resultado del trabajo archivado (estado que se muestra en la tabla). */
export function resultadoDeCierre(trabajo: TrabajoGradoResponse): stateList {
  switch (trabajo.etapa) {
    case 'FINALIZADO': return stateList.APROBADO;
    case 'NO_APROBADO': return stateList.NO_APROBADO;
    default: return stateList.CANCELADO;
  }
}
