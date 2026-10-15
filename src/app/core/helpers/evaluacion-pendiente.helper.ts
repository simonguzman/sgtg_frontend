import { ConceptoEvaluacionApi, TrabajoGradoResponse } from '../interfaces/api/trabajo-grado-api.interface';

/** @returns true si el usuario es evaluador asignado del anteproyecto */
export function esEvaluadorDelTrabajo(trabajo: TrabajoGradoResponse, userId: string | undefined): boolean {
  return !!userId && trabajo.anteproyecto.evaluadores.some(evaluador => String(evaluador.usuarioId) === userId);
}

/**
 * @returns true si el evaluador debe emitir concepto: el anteproyecto está en
 * evaluación y su versión actual aún no tiene el concepto del usuario
 */
export function tieneEvaluacionPendiente(trabajo: TrabajoGradoResponse, userId: string | undefined): boolean {
  if (trabajo.etapa !== 'EVALUACION' || !esEvaluadorDelTrabajo(trabajo, userId)) return false;
  const versiones = trabajo.anteproyecto.versiones;
  const actual = versiones[versiones.length - 1];
  if (!actual || actual.estado !== 'EN_REVISION') return false;
  return !trabajo.anteproyecto.conceptos.some(concepto =>
    concepto.version === actual.version && String(concepto.evaluadorUsuarioId) === userId);
}

/** Último concepto que emitió el usuario sobre el anteproyecto, si existe. */
export function ultimoConceptoDe(trabajo: TrabajoGradoResponse, userId: string | undefined): ConceptoEvaluacionApi | undefined {
  return [...trabajo.anteproyecto.conceptos].reverse()
    .find(concepto => String(concepto.evaluadorUsuarioId) === userId);
}

/**
 * @returns true si el evaluador ya evaluó el anteproyecto y no tiene una
 * evaluación pendiente: el trabajo pasa a su historial
 */
export function yaEvaluo(trabajo: TrabajoGradoResponse, userId: string | undefined): boolean {
  return esEvaluadorDelTrabajo(trabajo, userId) && !!ultimoConceptoDe(trabajo, userId)
    && !tieneEvaluacionPendiente(trabajo, userId);
}
