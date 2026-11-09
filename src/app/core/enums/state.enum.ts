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
  // Evaluación del anteproyecto: concepto de un evaluador que pide correcciones (CON_CORRECCIONES en el
  // backend) y resultado de la versión cuando ninguno lo rechaza pero alguno pide correcciones
  CON_CORRECCIONES = 'Con correcciones',
  EVALUADO_CON_OBSERVACIONES = 'Evaluado con observaciones',
  // Concepto del Comité de Programa sobre la propuesta (en el backend, APROBADO / NO_APROBADO)
  PERTINENTE = 'Pertinente',
  NO_PERTINENTE = 'No pertinente',
  // Reuniones de seguimiento del plazo de ejecución
  PENDIENTE = 'Pendiente',
  AGENDADA = 'Agendada',
  REALIZADA = 'Realizada',
  VENCIDA = 'Vencida',
  EN_SUSPENSION = 'En suspensión'
}
