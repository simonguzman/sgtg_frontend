import { ProjectStatus } from '../enum/projectStatus.enum';
import { ProjectStage } from '../enum/projectStage.enum';

/**
 * Estados del gráfico. No incluye "aprobado con observaciones": ningún trabajo
 * queda así (las correcciones de los evaluadores son un no aprobado).
 */
export const STATUS_CHART_LABELS: string[] = [
  'Aprobados', 'No Aprobados', 'En Revisión',
  'En Desarrollo', 'Aplazados', 'Suspendidos', 'Cancelados'
];

/** Estado de un trabajo, en singular (tabla del reporte) */
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.APROBADO]: 'Aprobado',
  [ProjectStatus.APROBADO_OBSERVACIONES]: 'Aprobado con observaciones',
  [ProjectStatus.NO_APROBADO]: 'No aprobado',
  [ProjectStatus.EN_REVISION]: 'En revisión',
  [ProjectStatus.EN_DESARROLLO]: 'En desarrollo',
  [ProjectStatus.APLAZADO]: 'Aplazado',
  [ProjectStatus.SUSPENDIDO]: 'Suspendido',
  [ProjectStatus.CANCELADO]: 'Cancelado'
};

export const STATUS_CHART_ORDER: ProjectStatus[] = [
  ProjectStatus.APROBADO,
  ProjectStatus.NO_APROBADO,
  ProjectStatus.EN_REVISION,
  ProjectStatus.EN_DESARROLLO,
  ProjectStatus.APLAZADO,
  ProjectStatus.SUSPENDIDO,
  ProjectStatus.CANCELADO
];

export const STATUS_CHART_COLORS = {
  background: [
    '#4ade80', '#f87171', '#94a3b8',
    '#38bdf8', '#fdba74', '#c084fc', '#64748b'
  ],
  border: [
    '#22c55e', '#dc2626', '#64748b',
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

/** Colores de las categorías sin orden fijo (modalidades, programas) */
export const CATEGORY_CHART_COLORS: string[] = ['#3b82f6', '#ec4899', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#64748b'];
