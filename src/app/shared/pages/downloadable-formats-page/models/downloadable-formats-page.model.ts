import { TabItem } from '../../../components/tabs/tabs.component';
import { Column } from '../../../components/table-component/table-component.component';

export interface DownloadableFormat {
  id: string;
  title: string;
  url: string;
}

export const DOWNLOADABLE_FORMATS_TABS: TabItem[] = [
  { label: 'Trabajo de investigación', value: 'TI' },
  { label: 'Práctica profesional',     value: 'PP' }
];

export const DOWNLOADABLE_FORMATS_COLUMNS: Column[] = [
  { field: 'title',    header: 'Título', type: 'text',    width: '80%' },
  {
    field: 'acciones', header: '', type: 'actions', width: '20%',
    actions: [{ action: 'descargar', label: 'Descargar formato', variant: 'primary', disabled: false }]
  }
];

export const DOWNLOADABLE_FORMATS_BY_CATEGORY: Record<string, DownloadableFormat[]> = {
  TI: [
    { id: 'ti-a', title: 'FORMATO TI-A: PRESENTACION DE LA PROPUESTA DE TRABAJO DE GRADO MODALIDAD PRACTICA PROFESIONAL AL COMITÉ DE PROGRAMA DEL ESTUDIANTE', url: 'assets/formats/TI/TI-A.pdf' },
    { id: 'ti-b', title: 'FORMATO TI-B: EVALUACION DEL ANTEPROYECTO POR EL DEPARTAMENTO', url: 'assets/formats/TI/TI-B.pdf' },
    { id: 'ti-c', title: 'FORMATO TI-C: PRESENTACION DEL ANTEPROYECTO POR EL JEFE DEL DEPARTAMENTO AL CONSEJO DE FACULTAD', url: 'assets/formats/TI/TI-C.pdf' },
    { id: 'ti-e', title: 'FORMATO TI-E: REMISION DEL DOCUMENTO FINAL AL CONSEJO DE FACULTAD POR EL DIRECTOR RESPECTIVO', url: 'assets/formats/TI/TI-E.pdf' },
    { id: 'ti-f', title: 'FORMATO TI-F: FORMATO DE REVISIÓN ACADÉMICA, PAZ Y SALVO FINANCIERO PARA NOMBRAMIENTO DE JURADOS DE PARA SUSTENTACIÓN DE TRABAJO DE GRADO', url: 'assets/formats/TI/TI-F.pdf' },
    { id: 'ti-g', title: 'FORMATO TI-G: ACTA DE PRIMERA (  ) SEGUNDA (  ) SUSTENTACIÓN (  )', url: 'assets/formats/TI/TI-G.pdf' },
    { id: 'ti-h', title: 'FORMATO TI-H: CONSTANCIA DEL DIRECTOR DEL TRABAJO Y JURADOS DE QUE EL MATERIAL ENTREGADO CORRESPONDE A LA VERSIÓN SUSTENTADA', url: 'assets/formats/TI/TI-H.pdf' },
    { id: 'acta-ti', title: 'ACTA DE TITULARIDAD DE DERECHOS DE PROPIEDAD INTELECTUAL PARA TRABAJOS DE GRADO, MODALIDAD INVESTIGACIÓN', url: 'assets/formats/TI/ACTA DE TITULARIDAD - MODALIDAD INVESTIGACIÓN.pdf' }
  ],
  PP: [
    { id: 'pp-a', title: 'FORMATO PP-A: PRESENTACION DE LA PROPUESTA DE TRABAJO DE GRADO MODALIDAD PRACTICA PROFESIONAL AL COMITÉ DE PROGRAMA DEL ESTUDIANTE', url: 'assets/formats/PP/PP-A.pdf' },
    { id: 'pp-b', title: 'FORMATO PP-B: EVALUACION DEL ANTEPROYECTO POR EL DEPARTAMENTO', url: 'assets/formats/PP/PP-B.pdf' },
    { id: 'pp-c', title: 'FORMATO PP-C: PRESENTACION DEL ANTEPROYECTO POR EL JEFE DEL DEPARTAMENTO AL CONSEJO DE FACULTAD', url: 'assets/formats/PP/PP-C.pdf' },
    { id: 'pp-d', title: 'FORMATO PP-D: EVALUACION DEL TRABAJO DE GRADO POR EL ASESOR DE LA PRACTICA PROFESIONAL', url: 'assets/formats/PP/PP-D.pdf' },
    { id: 'pp-e', title: 'FORMATO PP-E: REMISION DEL DOCUMENTO FINAL AL CONSEJO DE FACULTAD POR EL DIRECTOR RESPECTIVO', url: 'assets/formats/PP/PP-E.pdf' },
    { id: 'pp-f', title: 'FORMATO PP-F: FORMATO DE REVISIÓN ACADÉMICA, PAZ Y SALVO FINANCIERO PARA NOMBRAMIENTO DE JURADOS DE PARA SUSTENTACIÓN DE TRABAJO DE GRADO', url: 'assets/formats/PP/PP-F.pdf' },
    { id: 'pp-g', title: 'FORMATO PP-G: ACTA DE PRIMERA (  ) SEGUNDA (  ) SUSTENTACIÓN (  )', url: 'assets/formats/PP/PP-G.pdf' },
    { id: 'pp-h', title: 'FORMATO PP-H: CONSTANCIA DEL DIRECTOR DEL TRABAJO Y JURADOS DE QUE EL MATERIAL ENTREGADO CORRESPONDE A LA VERSIÓN SUSTENTADA', url: 'assets/formats/PP/PP-H.pdf' },
    { id: 'acta-pp', title: 'ACTA DE TITULARIDAD DE DERECHOS DE PROPIEDAD INTELECTUAL PARA TRABAJOS DE GRADO, MODALIDAD PRÁCTICA PROFESIONAL', url: 'assets/formats/PP/ACTA DE TITULARIDAD - MODALIDAD PRÁCTICA PROFESIONAL.pdf' },
    { id: 'carta-aceptacion', title: 'MODELO CARTA DE ACEPTACION DE PRACTICA PROFESIONAL', url: 'assets/formats/PP/CARTA DE ACEPTACION.pdf' }
  ]
};
