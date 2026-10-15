import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';

interface CorrespondenceTableRow {
  id: string;
  name: string;
  date: Date | string;
  status: stateList;
  allowedActions: string[];
  url: string;
}

/** Versión definitiva (formato H): la carga el jurado coordinador cuando la sustentación está aprobada. */
export const CorrespondenceTabConfig: TabConfiguration<CorrespondenceTableRow> = {
  tabValue: 'CORRESPONDENCIA',
  headerActionRoute: 'register_correspondence',
  columns: [
    { field: 'name', header: 'Versión definitiva', type: 'text', width: '50%' },
    { field: 'date', header: 'Fecha de registro', type: 'text', width: '30%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;
    const hasCorrespondence = thesis.documents?.some(
      (document: FileDocument) => document.type === DocumentType.FORMATO_H
    ) ?? false;
    return { ...baseContext, hasCorrespondence };
  },

  getTableData: (documents: FileDocument[]): CorrespondenceTableRow[] =>
    (documents ?? [])
      .filter((document: FileDocument) => document.type === DocumentType.FORMATO_H)
      .map((document): CorrespondenceTableRow => ({
        id: document.id,
        name: document.name,
        date: document.uploadDate || 'Sin fecha',
        status: document.status || stateList.APROBADO,
        allowedActions: ['view-details'],
        url: document.url
      })),

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived || !context.isCoordinator) return [];
    const approved = context.thesisWork?.sustentation?.state === 'APROBADA';
    return [{
      action: 'register_correspondence',
      label: approved ? 'Cargar versión definitiva' : 'Disponible al aprobarse la sustentación',
      variant: 'primary',
      disabled: !approved
    }];
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: 'Jurado coordinador',
    confirmDescription: '',
    uploadDocumentType: DocumentType.FORMATO_H
  }
};
