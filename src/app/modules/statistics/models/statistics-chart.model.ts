import { ProjectStatus } from '../enum/projectStatus.enum';
import { ProjectStage } from '../enum/projectStage.enum';

// IMPORTANTE: el orden de STATUS_CHART_LABELS debe coincidir exactamente
// con STATUS_CHART_ORDER — StatisticsChartDataService construye el
// arreglo `data` recorriendo STATUS_CHART_ORDER, así que la posición N de
// ambos describe el mismo segmento de la dona.
export const STATUS_CHART_LABELS: string[] = [
  'Aprobados', 'Aprobados c/ Obs.', 'No Aprobados', 'En Revisión',
  'En Desarrollo', 'Aplazados', 'Suspendidos', 'Cancelados'
];

export const STATUS_CHART_ORDER: ProjectStatus[] = [
  ProjectStatus.APROBADO,
  ProjectStatus.APROBADO_OBSERVACIONES,
  ProjectStatus.NO_APROBADO,
  ProjectStatus.EN_REVISION,
  ProjectStatus.EN_DESARROLLO,
  ProjectStatus.APLAZADO,
  ProjectStatus.SUSPENDIDO,
  ProjectStatus.CANCELADO
];

export const STATUS_CHART_COLORS = {
  background: [
    '#4ade80', '#fbbf24', '#f87171', '#94a3b8',
    '#38bdf8', '#fdba74', '#c084fc', '#64748b'
  ],
  border: [
    '#22c55e', '#d97706', '#dc2626', '#64748b',
    '#0ea5e9', '#ea580c', '#9333ea', '#475569'
  ]
};

export const STAGE_CHART_LABELS: string[] = ['Propuestas', 'Anteproyectos', 'Trabajos de Grado'];

export const STAGE_CHART_ORDER: ProjectStage[] = [
  ProjectStage.PROPUESTA,
  ProjectStage.ANTEPROYECTO,
  ProjectStage.TRABAJO_GRADO
];

export const STAGE_CHART_COLORS: string[] = ['#3b82f6', '#8b5cf6', '#ec4899'];
