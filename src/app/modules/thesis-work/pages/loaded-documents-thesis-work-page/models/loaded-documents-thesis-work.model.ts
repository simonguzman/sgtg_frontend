import { TabItem } from '../../../../../shared/components/tabs/tabs.component';

export const THESIS_TABS_CONFIG: TabItem[] = [
  { label: 'Informes mensuales',     value: 'AVANCES'         },
  { label: 'Entrega final',          value: 'ENTREGA FINAL'   },
  { label: 'Paz y salvo',            value: 'PAZ Y SALVO'     },
  { label: 'Sustentación',           value: 'SUSTENTACION'    },
  { label: 'Correspondencia',        value: 'CORRESPONDENCIA' },
  { label: 'Solicitudes especiales', value: 'SOLICITUDES'     },
];

export const TAB_MODAL_HEADERS: Record<string, string> = {
  'AVANCES':         'Detalles del informe mensual',
  'ENTREGA FINAL':   'Detalles de la Entrega Final',
  'PAZ Y SALVO':     'Detalles de Paz y Salvo',
  'CORRESPONDENCIA': 'Detalles de Correspondencia',
  'SOLICITUDES':     'Detalles de la Solicitud Especial',
};

export const TAB_MODAL_SUBTITLES: Record<string, string> = {
  'AVANCES':         'Información del informe mensual radicado',
  'ENTREGA FINAL':   'Información de los documentos de entrega final',
  'PAZ Y SALVO':     'Información de aprobaciones académicas y financieras',
  'CORRESPONDENCIA': 'Información de la resolución o correspondencia oficial',
  'SOLICITUDES':     'Información de la solicitud especial',
};

/** Pestañas de la fase 6: se muestran en solo lectura hasta que se integre esa fase. */
export const PHASE_6_TABS: readonly string[] = ['ENTREGA FINAL', 'PAZ Y SALVO', 'SUSTENTACION', 'CORRESPONDENCIA'];

/** Acciones de consulta que siguen disponibles en las pestañas de la fase 6. */
export const PHASE_6_READONLY_ACTIONS: readonly string[] = ['view-details', 'view_sustentation_details', 'download'];
