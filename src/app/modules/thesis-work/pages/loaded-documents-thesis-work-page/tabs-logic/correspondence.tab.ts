import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';

export const CorrespondenceTabConfig: TabConfiguration = {
  tabValue: 'CORRESPONDENCIA',
  columns: [
    { field: 'name', header: 'Documento / Resolución Final', type: 'text', width: '50%' },
    { field: 'date', header: 'Fecha de Registro', type: 'text', width: '30%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        { action: 'download', label: 'Descargar', icon: 'download', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    // 🔍 Única validación: ¿El jurado ya asentó la resolución/correspondencia?
    const hasCorrespondence = thesis.documents?.some(
      (doc: Document) => doc.type === DocumentType['FORMATO_H']
    ) ?? false;

    return {
      ...baseContext,
      hasCorrespondence
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext) => {
    if (!documents) return [];

    // Filtrar únicamente los formatos de resolución correspondientes
    const correspondenceDocs = documents.filter(
      (doc: Document) => doc.type === DocumentType['FORMATO_H']
    );

    return correspondenceDocs.map(doc => ({
      id: doc.id,
      name: doc.name,
      date: doc.uploadDate || 'Sin fecha',
      status: doc.status || stateList.APROBADO,
      allowedActions: ['download'],
      url: doc.url
    }));
  },

  getHeaderButtons: (context: ThesisEvaluationContext) => {
    const buttons: TableButton[] = [];

    // Extraemos isJuror en lugar de isDirector
    const { isJuror, hasCorrespondence } = context as any;

    // 🧠 REGLA DE NEGOCIO CORREGIDA: Solo el Jurado ejecuta la acción
    if (isJuror) {
      buttons.push({
        action: 'register_correspondence',
        label: hasCorrespondence ? 'Correspondencia Registrada' : 'Registrar Correspondencia',
        variant: 'primary',
        disabled: hasCorrespondence // Se deshabilita si el registro ya fue completado
      });
    }

    return buttons;
  },

  modalConfig: {
    uploadDescription: 'Subir documento oficial de correspondencia o resolución de consejo.',
    uploadedByText: 'Cargado por el Jurado evaluador', // Texto actualizado
    confirmDescription: '¿Está seguro de que desea registrar este documento oficial de correspondencia?',
    uploadDocumentType: DocumentType['FORMATO_H']
  }
};
