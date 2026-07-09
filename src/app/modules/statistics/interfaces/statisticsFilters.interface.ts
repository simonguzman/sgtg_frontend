import { ProjectStage } from "../enum/projectStage.enum";

export interface StatisticsFilters {
  stage: ProjectStage | null;
  period: string | null;
  directorId: string | null;
  archiveStatus: 'ACTIVE' | 'ARCHIVED' | 'ALL';
}
