import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';

export const CorrespondenceTabConfig: TabConfiguration = {
  tabValue: 'CORRESPONDENCIA',

  // 🚀 Se registra la ruta de acción del botón principal para la navegación automática del contenedor
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

    // 🔍 Única validación: ¿El jurado ya asentó la resolución/correspondencia?
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

    // Filtrar únicamente los formatos de resolución correspondientes
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

    // 🚀 Eliminamos el casteo "as any" ya que las propiedades existen de forma segura en ThesisEvaluationContext
    const { isJuror, hasCorrespondence } = context;

    // 🧠 REGLA DE NEGOCIO CORREGIDA: Solo el Jurado ejecuta la acción
    if (isJuror) {
      buttons.push({
        action: 'register_correspondence',
        label: hasCorrespondence ? 'Correspondencia Registrada' : 'Registrar Correspondencia',
        variant: 'primary',
        disabled: !!hasCorrespondence // Se deshabilita si el registro ya fue completado
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
