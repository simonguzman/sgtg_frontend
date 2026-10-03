import { TabItem } from "../../../../../shared/components/tabs/tabs.component";

export const HISTORY_TABS_CONFIG: TabItem[] = [
  { label: 'Propuestas Archivadas', value: 'PROPUESTAS' },
  { label: 'Anteproyectos Archivados', value: 'ANTEPROYECTOS' },
  { label: 'Trabajos de Grado Finalizados', value: 'TRABAJOS' },
];

export const HISTORY_DETAIL_ROUTES: Record<string, string> = {
  'PROPUESTAS': 'proposal-details',
  'ANTEPROYECTOS': 'preliminary-draft-details',
  'TRABAJOS': 'thesis-work-details'
};
