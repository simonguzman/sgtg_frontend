import { FinalDeliveryTabConfig } from './final-delivery.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { FinalDelivery } from '../../../interfaces/final-delivery.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

// Mock de la función helper para aislar la prueba unitaria
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn().mockReturnValue('15/08/2026')
}));

describe('FinalDeliveryTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Uso de Partial<T> para construir mocks seguros sin recurrir a 'as unknown'
    const mockUser: Partial<User> = { id: 'user-1' };

    const mockThesisWork: Partial<ThesisWork> = {
      thesisWorkId: 'thesis-1',
      state: stateList.EN_DESARROLLO,
      finalDeliveries: []
    };

    baseContext = {
      currentUser: mockUser as User,
      isStudent: false,
      isDirector: false,
      isCodirector: false,
      isAdvisor: false,
      isAdmin: false,
      isArchived: false,
      isDecanatura: false,
      isJuror: false,
      isConsejo: false,
      latestAdvanceId: null,
      isLatestAdvancePending: false,
      thesisWork: mockThesisWork as ThesisWork
    };
  });

  describe('Propiedades Estáticas y Configuración', () => {
    it('debe tener los valores estáticos, columnas y modalConfig correctos', () => {
      expect(FinalDeliveryTabConfig.tabValue).toBe('ENTREGA FINAL');
      expect(FinalDeliveryTabConfig.headerActionRoute).toBe('register_final_delivery');
      expect(FinalDeliveryTabConfig.columns).toHaveLength(4);
      expect(FinalDeliveryTabConfig.modalConfig?.uploadDocumentType).toBe(DocumentType.FORMATO_E);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = FinalDeliveryTabConfig.enrichEvaluationContext!(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe marcar isSuspendedOrCanceled como true si la tesis está SUSPENDIDA o CANCELADA', () => {
      baseContext.thesisWork = { ...baseContext.thesisWork, state: stateList.SUSPENDIDO } as ThesisWork;
      let result = FinalDeliveryTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);

      baseContext.thesisWork = { ...baseContext.thesisWork, state: stateList.CANCELADO } as ThesisWork;
      result = FinalDeliveryTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);
    });

    it('debe marcar hasFinalDelivery como true si existe al menos una entrega que NO sea NO_APROBADO', () => {
      const delivery1: Partial<FinalDelivery> = { status: stateList.NO_APROBADO };
      const delivery2: Partial<FinalDelivery> = { status: stateList.EN_REVISION };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        finalDeliveries: [delivery1 as FinalDelivery, delivery2 as FinalDelivery]
      } as ThesisWork;

      const result = FinalDeliveryTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasFinalDelivery).toBe(true);
    });

    it('debe marcar hasFinalDelivery como false si todas las entregas son NO_APROBADO o no hay entregas', () => {
      const delivery1: Partial<FinalDelivery> = { status: stateList.NO_APROBADO };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        finalDeliveries: [delivery1 as FinalDelivery]
      } as ThesisWork;

      let result = FinalDeliveryTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasFinalDelivery).toBe(false);

      baseContext.thesisWork = { ...baseContext.thesisWork, finalDeliveries: [] } as ThesisWork;
      result = FinalDeliveryTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasFinalDelivery).toBe(false);
    });
  });

  describe('getTableData', () => {
    const dummyDocs: FileDocument[] = [];

    it('debe retornar un array vacío si no hay finalDeliveries', () => {
      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        finalDeliveries: undefined // Simulamos ausencia de la propiedad
      } as unknown as ThesisWork;

      const rows = FinalDeliveryTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows).toEqual([]);
    });

    it('debe mapear correctamente cuando la fecha es un objeto Date', () => {
      const dateObj = new Date('2026-08-15');
      const mockDelivery: Partial<FinalDelivery> = {
        id: 'delivery-1',
        monograph: {
          name: 'Monografía Final',
          id: 'm-1',
          url: '',
          uploadDate: dateObj,
          type: DocumentType.FORMATO_E // ← SOLUCIÓN: Agregamos la propiedad requerida
        } as FileDocument,
        uploadDate: dateObj,
        status: stateList.APROBADO
      };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        finalDeliveries: [mockDelivery as FinalDelivery]
      } as ThesisWork;

      const rows = FinalDeliveryTabConfig.getTableData!(dummyDocs, baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Entrega Final - Monografía Final');
      expect(rows[0].uploadDate).toBe('15/08/2026');
      expect(formatThesisDate).toHaveBeenCalledWith(dateObj);
      expect(rows[0].status).toBe(stateList.APROBADO);
    });

    it('debe mantener la fecha tal cual si ya es un string', () => {
      const mockDelivery: Partial<FinalDelivery> = {
        id: 'delivery-2',
        uploadDate: '2026-08-01',
        status: stateList.EN_REVISION
      };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        finalDeliveries: [mockDelivery as FinalDelivery]
      } as ThesisWork;

      const rows = FinalDeliveryTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows[0].uploadDate).toBe('2026-08-01');
      expect(formatThesisDate).not.toHaveBeenCalled();
    });

    it('debe asignar "Sin fecha" si uploadDate es falsy y manejar fallbacks de texto', () => {
      const mockDelivery: Partial<FinalDelivery> = { id: 'delivery-3' }; // Objeto vacío intencional

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        finalDeliveries: [mockDelivery as FinalDelivery]
      } as ThesisWork;

      const rows = FinalDeliveryTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows[0].uploadDate).toBe('Sin fecha');
      expect(rows[0].name).toBe('Entrega Final - Documentación'); // Valida el fallback
      expect(rows[0].status).toBe(stateList.EN_REVISION); // Valida el estado fallback
    });

    it('debe forzar el estado NO_APROBADO si la tesis completa está en estado NO_APROBADO', () => {
      const mockDelivery: Partial<FinalDelivery> = {
        id: 'delivery-4',
        status: stateList.APROBADO // Debería ser sobreescrito
      };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        state: stateList.NO_APROBADO,
        finalDeliveries: [mockDelivery as FinalDelivery]
      } as ThesisWork;

      const rows = FinalDeliveryTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows[0].status).toBe(stateList.NO_APROBADO);
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si la tesis está archivada', () => {
      baseContext.isArchived = true;
      baseContext.isDirector = true;
      const buttons = FinalDeliveryTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar array vacío si el usuario no es Director ni Admin', () => {
      baseContext.isDirector = false;
      baseContext.isAdmin = false;
      const buttons = FinalDeliveryTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar el botón habilitado si es Director y no hay entregas previas ni bloqueos', () => {
      baseContext.isDirector = true;
      baseContext.hasFinalDelivery = false;
      baseContext.isSuspendedOrCanceled = false;

      const buttons = FinalDeliveryTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Cargar entrega final');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_final_delivery');
    });

    it('debe retornar el botón deshabilitado si ya hay una entrega final', () => {
      baseContext.isDirector = true;
      baseContext.hasFinalDelivery = true;

      const buttons = FinalDeliveryTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Entrega final registrada');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe retornar el botón deshabilitado si la tesis está suspendida o cancelada', () => {
      baseContext.isAdmin = true;
      baseContext.isSuspendedOrCanceled = true;

      const buttons = FinalDeliveryTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe retornar el botón deshabilitado si la tesis no está aprobada (NO_APROBADO)', () => {
      baseContext.isDirector = true;
      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        state: stateList.NO_APROBADO
      } as ThesisWork;

      const buttons = FinalDeliveryTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
