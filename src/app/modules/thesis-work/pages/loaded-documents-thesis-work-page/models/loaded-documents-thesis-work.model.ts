import { TabItem } from '../../../../../shared/components/tabs/tabs.component';

export const THESIS_TABS_CONFIG: TabItem[] = [
  { label: 'Informes mensuales',     value: 'AVANCES'         },
  { label: 'Entrega final',          value: 'ENTREGA FINAL'   },
  { label: 'Paz y salvo',            value: 'PAZ Y SALVO'     },
  { label: 'Sustentación',           value: 'SUSTENTACION'    },
  { label: 'Versión definitiva',     value: 'CORRESPONDENCIA' },
  { label: 'Solicitudes especiales', value: 'SOLICITUDES'     },
];

export const TAB_MODAL_HEADERS: Record<string, string> = {
  'AVANCES':         'Detalles del informe mensual',
  'ENTREGA FINAL':   'Detalles de la solicitud de sustentación',
  'PAZ Y SALVO':     'Detalles de Paz y Salvo',
  'CORRESPONDENCIA': 'Detalles de la versión definitiva',
  'SOLICITUDES':     'Detalles de la Solicitud Especial',
};

export const TAB_MODAL_SUBTITLES: Record<string, string> = {
  'AVANCES':         'Información del informe mensual radicado',
  'ENTREGA FINAL':   'Documentos de la entrega final',
  'PAZ Y SALVO':     'Paz y salvo adjunto a la solicitud de sustentación',
  'CORRESPONDENCIA': 'Versión definitiva (formato H) del trabajo de grado',
  'SOLICITUDES':     'Información de la solicitud especial',
};
