import { ProjectStage } from '../enum/projectStage.enum';

export interface StageOption {
  label: string;
  value: ProjectStage;
}

export const STAGE_OPTIONS: StageOption[] = [
  { label: 'Propuesta', value: ProjectStage.PROPUESTA },
  { label: 'Anteproyecto', value: ProjectStage.ANTEPROYECTO },
  { label: 'Trabajo de Grado', value: ProjectStage.TRABAJO_GRADO }
];
