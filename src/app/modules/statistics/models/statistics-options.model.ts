import { ProjectStage } from '../enum/projectStage.enum';

export interface StageOption {
  label: string;
  value: ProjectStage;
}

// ← Antes vivía como signal(...) dentro de StatisticsStateService. Es un
// arreglo verdaderamente estático — nada lo actualiza con .set()/.update()
// — así que envolverlo en un signal sugería una reactividad inexistente.
// Mismo patrón que PROPOSAL_COLUMNS o THESIS_TABS_CONFIG: constante plana
// en un archivo de modelo.
export const STAGE_OPTIONS: StageOption[] = [
  { label: 'Propuesta', value: ProjectStage.PROPUESTA },
  { label: 'Anteproyecto', value: ProjectStage.ANTEPROYECTO },
  { label: 'Trabajo de Grado', value: ProjectStage.TRABAJO_GRADO }
];
