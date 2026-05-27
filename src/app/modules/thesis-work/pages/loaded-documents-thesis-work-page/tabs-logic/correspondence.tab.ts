import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';

export const CorrespondenceTabConfig: TabConfiguration = {
  tabValue: 'CORRESPONDENCIA',

  headerActionRoute: 'register_correspondence',

  columns: [
    { field: 'name', header: 'Documento / Resolución Final', type: 'text', width: '50%' },
    { field: 'date', header: 'Fecha de Registro', type: 'text', width: '30%' },
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
      (doc: Document) => doc.type === DocumentType.FORMATO_H
    ) ?? false;

    return {
      ...baseContext,
      hasCorrespondence
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext) => {
    if (!documents) return [];
    const correspondenceDocs = documents.filter(
      (doc: Document) => doc.type === DocumentType.FORMATO_H
    );

    return correspondenceDocs.map(doc => ({
      id: doc.id,
      name: doc.name,
      date: doc.uploadDate || 'Sin fecha',
      status: doc.status || stateList.APROBADO,
      allowedActions: ['view-details'],
      url: doc.url
    }));
  },

  getHeaderButtons: (context: ThesisEvaluationContext) => {
    const buttons: TableButton[] = [];
    const { isJuror, hasCorrespondence } = context;
    if (isJuror) {
      buttons.push({
        action: 'register_correspondence',
        label: hasCorrespondence ? 'Correspondencia Registrada' : 'Registrar Correspondencia',
        variant: 'primary',
        disabled: !!hasCorrespondence
      });
    }

    return buttons;
  },

  modalConfig: {
    uploadDescription: 'Subir documento oficial de correspondencia o resolución de consejo.',
    uploadedByText: 'Cargado por el Jurado evaluador',
    confirmDescription: '¿Está seguro de que desea registrar este documento oficial de correspondencia?',
    uploadDocumentType: DocumentType.FORMATO_H
  }
};
