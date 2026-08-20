import { SpecialRequestTabConfig } from './special-request.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';

// Inferimos el tipo exacto del arreglo de sustentaciones desde ThesisWork
// Esto evita tener que importar interfaces que tal vez no expone el módulo
type SustentationItem = NonNullable<ThesisWork['sustentations']>[number];

describe('SpecialRequestTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockUser: Partial<User> = { id: 'user-1' };

    const mockThesisWork: Partial<ThesisWork> = {
      thesisWorkId: 'thesis-1',
      state: stateList.EN_DESARROLLO,
      sustentations: [],
      specialRequests: []
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

  describe('Propiedades Estáticas', () => {
    it('debe tener los valores estáticos y columnas correctas', () => {
      expect(SpecialRequestTabConfig.tabValue).toBe('SOLICITUDES');
      expect(SpecialRequestTabConfig.headerActionRoute).toBe('register_special_request');
      expect(SpecialRequestTabConfig.columns).toHaveLength(4);
      expect(SpecialRequestTabConfig.modalConfig?.uploadDocumentType).toBeUndefined();
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = SpecialRequestTabConfig.enrichEvaluationContext!(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe marcar isSustentationFinalized como false si no hay sustentaciones o veredictos', () => {
      baseContext.thesisWork!.sustentations = [];
      let result = SpecialRequestTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSustentationFinalized).toBe(false);

      const mockSustentation: Partial<SustentationItem> = { verdicts: [] };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      result = SpecialRequestTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSustentationFinalized).toBe(false);
    });

    it('debe marcar isSustentationFinalized como false si el último veredicto es APLAZADO', () => {
      const mockSustentation: Partial<SustentationItem> = {
        verdicts: [
          { veredict: stateList.APROBADO } as Partial<JurorVerdict> as JurorVerdict,
          { veredict: stateList.APLAZADO } as Partial<JurorVerdict> as JurorVerdict
        ]
      };

      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SpecialRequestTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSustentationFinalized).toBe(false);
    });

    it('debe marcar isSustentationFinalized como true si hay veredictos y el último NO es APLAZADO', () => {
      const mockSustentation: Partial<SustentationItem> = {
        verdicts: [
          { veredict: stateList.APLAZADO } as Partial<JurorVerdict> as JurorVerdict,
          { veredict: stateList.APROBADO } as Partial<JurorVerdict> as JurorVerdict
        ]
      };

      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SpecialRequestTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSustentationFinalized).toBe(true);
    });
  });

  describe('getTableData', () => {
    const dummyDocs: FileDocument[] = [];

    it('debe retornar un array vacío si no hay thesisWork o specialRequests', () => {
      // Eliminamos la propiedad de forma segura en TypeScript para testear el IF de control
      const thesisPartial: Partial<ThesisWork> = baseContext.thesisWork as Partial<ThesisWork>;
      delete thesisPartial.specialRequests;

      const rows = SpecialRequestTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows).toEqual([]);
    });

    it('debe mapear correctamente los datos y manejar fechas nulas o ausentes', () => {
      const mockRequest: Partial<SpecialRequest> = {
        id: 'req-1',
        description: 'Prorroga de entrega',
        requestDate: undefined, // En lugar de usar null con un cast a Date, simulamos su ausencia
        status: stateList.APROBADO
      };

      baseContext.thesisWork!.specialRequests = [mockRequest as SpecialRequest];

      const rows = SpecialRequestTabConfig.getTableData!(dummyDocs, baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('req-1');
      expect(rows[0].description).toBe('Prorroga de entrega');
      expect(rows[0].date).toBe('Sin fecha');
      expect(rows[0].status).toBe(stateList.APROBADO);
      expect(rows[0].allowedActions).toEqual(['view-details']);
    });

    it('debe formatear la fecha correctamente usando toLocaleDateString', () => {
      const dateString = '2026-08-15T10:00:00Z';
      const mockRequest: Partial<SpecialRequest> = {
        id: 'req-2',
        requestDate: dateString as unknown as Date, // Aseguramos que TS lo tome si la interfaz requiere tipo Date strict
        status: stateList.EN_REVISION
      };

      baseContext.thesisWork!.specialRequests = [mockRequest as SpecialRequest];

      const expectedDate = new Date(dateString).toLocaleDateString('es-ES');
      const rows = SpecialRequestTabConfig.getTableData!(dummyDocs, baseContext);

      expect(rows[0].date).toBe(expectedDate);
    });

    it('NO debe agregar la acción evaluate_special_request si es el Consejo pero está archivado', () => {
      baseContext.isConsejo = true;
      baseContext.isArchived = true;

      const mockRequest: Partial<SpecialRequest> = {
        id: 'req-3',
        status: stateList.EN_REVISION
      };
      baseContext.thesisWork!.specialRequests = [mockRequest as SpecialRequest];

      const rows = SpecialRequestTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows[0].allowedActions).toEqual(['view-details']);
    });

    it('NO debe agregar la acción evaluate_special_request si es el Consejo pero el estado no es EN_REVISION', () => {
      baseContext.isConsejo = true;
      baseContext.isArchived = false;

      const mockRequest: Partial<SpecialRequest> = {
        id: 'req-4',
        status: stateList.APROBADO
      };
      baseContext.thesisWork!.specialRequests = [mockRequest as SpecialRequest];

      const rows = SpecialRequestTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows[0].allowedActions).toEqual(['view-details']);
    });

    it('DEBE agregar la acción evaluate_special_request si es Consejo, no está archivado y está EN_REVISION', () => {
      baseContext.isConsejo = true;
      baseContext.isArchived = false;

      const mockRequest: Partial<SpecialRequest> = {
        id: 'req-5',
        status: stateList.EN_REVISION
      };
      baseContext.thesisWork!.specialRequests = [mockRequest as SpecialRequest];

      const rows = SpecialRequestTabConfig.getTableData!(dummyDocs, baseContext);
      expect(rows[0].allowedActions).toContain('view-details');
      expect(rows[0].allowedActions).toContain('evaluate_special_request');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si está archivado', () => {
      baseContext.isArchived = true;
      baseContext.isDirector = true;
      const buttons = SpecialRequestTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar array vacío si el usuario no es Director ni Admin', () => {
      baseContext.isDirector = false;
      baseContext.isAdmin = false;
      const buttons = SpecialRequestTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar botón habilitado "Registrar Solicitud Especial" si la sustentación NO ha finalizado', () => {
      baseContext.isAdmin = true;
      baseContext.isSustentationFinalized = false;

      const buttons = SpecialRequestTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Registrar Solicitud Especial');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_special_request');
    });

    it('debe retornar botón deshabilitado "Sustentación Finalizada" si la sustentación SÍ ha finalizado', () => {
      baseContext.isDirector = true;
      baseContext.isSustentationFinalized = true;

      const buttons = SpecialRequestTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Sustentación Finalizada');
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
