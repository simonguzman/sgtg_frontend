import { stateList } from '../../../../core/enums/state.enum';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { Column, TableRow } from '../../../components/table-component/table-component.component';

/** Fila de la tabla de evaluaciones realizadas. */
export interface EvaluationTableRow extends TableRow {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  documentTargetName: string;
  veredict: stateList;
  observations: string;
  date: Date;
  signedDocuments: FormattedDocument[];
  allowedActions: string[];
}

/** Evaluación antes de darle formato de fila; sus documentos pueden venir en varias formas. */
export type RawEvaluationData = Omit<Partial<Evaluation>, 'signedDocuments'> & {
  documentTargetName?: string;
  comments?: string;
  signedDocuments?: (string | FormattedDocument | FileDocument)[];
};

/** Columnas de la tabla de evaluaciones realizadas. */
export const EVALUATIONS_COLUMNS: Column[] = [
  { field: 'evaluatorName',      header: 'Nombre',               type: 'text',   width: '20%' },
  { field: 'evaluatorRole',      header: 'Rol',                  type: 'text',   width: '20%' },
  { field: 'documentTargetName', header: 'Documento evaluado',   type: 'text',   width: '25%' },
  { field: 'veredict',           header: 'Resultado',            type: 'state',  width: '20%' },
  {
    field: 'acciones',
    header: 'Detalles',
    type: 'actions',
    width: '15%',
    actions: [
      { action: 'view_details', label: 'Ver detalles', variant: 'primary', disabled: false }
    ]
  }
];
