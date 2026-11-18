/**
 * Estados que se muestran de las propuestas, los anteproyectos, los trabajos de grado, sus documentos y sus
 * reuniones de seguimiento.
 */
export enum stateList{
  APROBADO = 'Aprobado',
  APROBADO_CON_OBSERVACIONES = 'Aprobado con observaciones',
  NO_APROBADO = 'No aprobado',
  APLAZADO = 'Aplazado',
  EN_DESARROLLO = 'En desarrollo',
  EVALUADO = 'Evaluado',
  EN_REVISION = 'En revisión',
  CANCELADO = 'Cancelado',
  SUSPENDIDO = 'Suspendido',
  /** Concepto de un evaluador del anteproyecto que pide correcciones (CON_CORRECCIONES en el backend). */
  CON_CORRECCIONES = 'Con correcciones',
  /** Resultado de una versión del anteproyecto que ningún evaluador rechaza pero alguno pide corregir. */
  EVALUADO_CON_OBSERVACIONES = 'Evaluado con observaciones',
  /** Concepto del Comité del programa sobre la propuesta (APROBADO en el backend). */
  PERTINENTE = 'Pertinente',
  /** Concepto del Comité del programa sobre la propuesta (NO_APROBADO en el backend). */
  NO_PERTINENTE = 'No pertinente',
  /** Estados de las reuniones de seguimiento del plazo de ejecución: pendiente, agendada, realizada, vencida y en suspensión. */
  PENDIENTE = 'Pendiente',
  AGENDADA = 'Agendada',
  REALIZADA = 'Realizada',
  VENCIDA = 'Vencida',
  EN_SUSPENSION = 'En suspensión'
}
