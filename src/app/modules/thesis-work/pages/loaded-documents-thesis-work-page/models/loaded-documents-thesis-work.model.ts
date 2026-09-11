import { TabItem } from '../../../../../shared/components/tabs/tabs.component';

export const THESIS_TABS_CONFIG: TabItem[] = [
  { label: 'Avances',                value: 'AVANCES'         },
  { label: 'Entrega final',          value: 'ENTREGA FINAL'   },
  { label: 'Paz y salvo',            value: 'PAZ Y SALVO'     },
  { label: 'Sustentación',           value: 'SUSTENTACION'    },
  { label: 'Correspondencia',        value: 'CORRESPONDENCIA' },
  { label: 'Solicitudes especiales', value: 'SOLICITUDES'     },
];

// Sustituye los if-else de modalDetailsHeader y modalDetailsSubtitle en el componente.
// Un Record elimina la lógica imperativa y centraliza el dato en un único lugar.
export const TAB_MODAL_HEADERS: Record<string, string> = {
  'AVANCES':         'Detalles del avance',
  'ENTREGA FINAL':   'Detalles de la Entrega Final',
  'PAZ Y SALVO':     'Detalles de Paz y Salvo',
  'CORRESPONDENCIA': 'Detalles de Correspondencia',
  'SOLICITUDES':     'Detalles de la Solicitud Especial',
};

export const TAB_MODAL_SUBTITLES: Record<string, string> = {
  'AVANCES':         'Información del avance cargado',
  'ENTREGA FINAL':   'Información de los documentos de entrega final',
  'PAZ Y SALVO':     'Información de aprobaciones académicas y financieras',
  'CORRESPONDENCIA': 'Información de la resolución o correspondencia oficial',
  'SOLICITUDES':     'Información de la solicitud especial',
};
