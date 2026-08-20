import { TabItem } from "../../../../../shared/components/tabs/tabs.component";

export const HISTORY_TABS_CONFIG: TabItem[] = [
  { label: 'Propuestas Archivadas', value: 'PROPUESTAS' },
  { label: 'Anteproyectos Archivados', value: 'ANTEPROYECTOS' },
  { label: 'Trabajos de Grado Finalizados', value: 'TRABAJOS' },
];

// Reemplaza el if/else-if de 3 ramas en handleTableAction — mismo patrón
// que TAB_MODAL_HEADERS del módulo de trabajo de grado.
export const HISTORY_DETAIL_ROUTES: Record<string, string> = {
  'PROPUESTAS': 'proposal-details',
  'ANTEPROYECTOS': 'preliminary-draft-details',
  'TRABAJOS': 'thesis-work-details'
};
