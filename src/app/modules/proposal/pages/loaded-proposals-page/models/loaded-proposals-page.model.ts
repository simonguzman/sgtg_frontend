import { Column } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { RegisterDetailField } from '../../../../../shared/components/modals/register-information-modal/register-information-modal.component';

/**
 * Registro de la propuesta: cada versión radicada del formato A. La primera
 * versión de una práctica profesional incluye también la carta de aceptación.
 */
export interface DocumentTableRow {
  id: string;
  name: string;
  uploadDate: string | Date;
  /** Estado de la revisión de la versión (En revisión, Pertinente, No pertinente) */
  status?: stateList;
  /** Número de versión del formato A; vacío si el registro no tiene formato A */
  version?: number;
  /** Documentos radicados en este registro */
  documents: FileDocument[];
  allowedActions: string[];
}

/** Información de un registro que se muestra en el modal de detalles. */
export interface ProposalRegistrationDetails {
  subtitle: string;
  title: string;
  /** Objetivos, descripción, línea de investigación y organización (solo los registrados) */
  fields: RegisterDetailField[];
  modality: string;
  student: string;
  director: string;
  codirector?: string;
  adviser?: string;
  chargeDate: Date;
  state?: stateList;
  documents: FileDocument[];
}

export const DOCUMENTS_COLUMNS: Column[] = [
  { field: 'name',       header: 'Documentos',     type: 'text',  width: '30%' },
  { field: 'version',    header: 'Versión',        type: 'text',  width: '10%' },
  { field: 'uploadDate', header: 'Fecha de carga', type: 'text',  width: '20%' },
  { field: 'status',     header: 'Estado',         type: 'state', width: '15%' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    width: '25%',
    actions: [
      { action: 'view-details', label: 'Ver detalles',      icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'evaluate',     label: 'Evaluar propuesta', icon: 'assignment', variant: 'primary', disabled: false }
    ]
  }
];
