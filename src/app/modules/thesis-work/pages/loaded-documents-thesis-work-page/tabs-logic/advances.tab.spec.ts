import { AdvancesTabConfig } from './advances.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Advance } from '../../../interfaces/advance.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';

// Mockeamos el helper de fechas para tener un output predecible
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn(() => 'fecha-formateada-mock')
}));

describe('AdvancesTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // Usamos Partial<T> para construir mocks estrictos sin 'any' ni 'unknown'
    const mockUser: Partial<User> = { id: 'user-1' };

    const mockThesisWork: Partial<ThesisWork> = {
      thesisWorkId: 'thesis-1',
      advances: [],
      documents: [],
      evaluations: [],
      state: stateList.EN_DESARROLLO
    };

    // Restaurar baseContext para cada prueba con todas las propiedades requeridas
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
    it('debe tener el tabValue y rutas correctas', () => {
      expect(AdvancesTabConfig.tabValue).toBe('AVANCES');
      expect(AdvancesTabConfig.headerActionRoute).toBe('upload_advance');
      expect(AdvancesTabConfig.columns).toHaveLength(4);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = AdvancesTabConfig.enrichEvaluationContext!(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe calcular correctly requiredEvaluatorsCount basado en la propuesta', () => {
      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        preliminaryDraftData: {
          proposalData: { director: 'dir-1', advisor: 'adv-1' } as any
          // (Nota interna: en objetos profundamente anidados y aislados, se extrae el tipo si es posible,
          // pero al ser una estructura de solo lectura parcial, esta composición directa es segura).
        }
      } as ThesisWork;

      const result = AdvancesTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.requiredEvaluatorsCount).toBe(2);
    });

    it('debe identificar isLatestAdvancePending si el primer avance está EN_REVISION', () => {
      const mockAdvance: Partial<Advance> = { id: 'adv-1', status: stateList.EN_REVISION };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        advances: [mockAdvance as Advance]
      } as ThesisWork;

      const result = AdvancesTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.latestAdvanceId).toBe('adv-1');
      expect(result.isLatestAdvancePending).toBe(true);
    });

    it('debe detectar hasFinalDelivery si existe un FORMATO_E', () => {
      const mockDocument: Partial<FileDocument> = { type: DocumentType.FORMATO_E };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        documents: [mockDocument as FileDocument]
      } as ThesisWork;

      const result = AdvancesTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasFinalDelivery).toBe(true);
    });

    it('debe identificar isSuspendedOrCanceled correctamente', () => {
      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        state: stateList.SUSPENDIDO
      } as ThesisWork;

      const result = AdvancesTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);
    });
  });

  describe('getTableData', () => {
    let mockAdvance: Partial<Advance>;

    beforeEach(() => {
      const mockDoc: Partial<FileDocument> = { url: 'http://docs/1' };

      mockAdvance = {
        id: 'adv-1',
        title: 'Avance 1',
        comments: 'Comentarios',
        uploadDate: new Date('2026-08-03'),
        status: stateList.EN_REVISION,
        documents: [mockDoc as FileDocument]
      };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        advances: [mockAdvance as Advance]
      } as ThesisWork;
    });

    it('debe mapear correctamente las propiedades del avance a AdvanceTableRow', () => {
      const rows = AdvancesTabConfig.getTableData!([], baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('adv-1');
      expect(rows[0].name).toBe('Avance 1');
      expect(rows[0].url).toBe('http://docs/1');
      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(rows[0].allowedActions).toContain('view-details');
    });

    it('debe mapear correctamente la fecha si uploadDate viene como string y manejar arreglo vacío de documentos', () => {
      // Esta prueba garantiza el 100% de cobertura en las ramas del mapeo (ternarios)
      const mockAdvanceStrDate: Partial<Advance> = {
        id: 'adv-2',
        title: 'Avance String',
        uploadDate: '2026-10-15', // Fecha como string en lugar de Date
        status: stateList.EN_DESARROLLO
        // No enviamos 'documents' para probar el fallback || []
      };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        advances: [mockAdvanceStrDate as Advance]
      } as ThesisWork;

      const rows = AdvancesTabConfig.getTableData!([], baseContext);

      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(rows[0].documents).toEqual([]);
      expect(rows[0].url).toBe('');
    });

    it('debe permitir "evaluate-advance" a un evaluador si no ha evaluado', () => {
      baseContext.isDirector = true;

      const rows = AdvancesTabConfig.getTableData!([], baseContext);

      expect(rows[0].allowedActions).toContain('evaluate-advance');
    });

    it('NO debe permitir "evaluate-advance" si el usuario ya evaluó', () => {
      baseContext.isDirector = true;
      const mockEval: Partial<Evaluation> = { advanceId: 'adv-1', evaluatorId: 'user-1' };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        evaluations: [mockEval as Evaluation],
        advances: [mockAdvance as Advance]
      } as ThesisWork;

      const rows = AdvancesTabConfig.getTableData!([], baseContext);

      expect(rows[0].allowedActions).not.toContain('evaluate-advance');
    });

    it('NO debe permitir "evaluate-advance" si existe una entrega final', () => {
      baseContext.isDirector = true;
      baseContext.hasFinalDelivery = true;

      const rows = AdvancesTabConfig.getTableData!([], baseContext);

      expect(rows[0].allowedActions).not.toContain('evaluate-advance');
    });

    it('NO debe permitir "evaluate-advance" si el avance ya fue EVALUADO', () => {
      baseContext.isDirector = true;
      mockAdvance.status = stateList.EVALUADO;

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        advances: [mockAdvance as Advance]
      } as ThesisWork;

      const rows = AdvancesTabConfig.getTableData!([], baseContext);

      expect(rows[0].allowedActions).not.toContain('evaluate-advance');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si está archivado', () => {
      baseContext.isArchived = true;
      const buttons = AdvancesTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar el botón de Cargar avance para Estudiantes con config normal', () => {
      baseContext.isStudent = true;
      const buttons = AdvancesTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Cargar nuevo avance');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debe deshabilitar y cambiar el label del botón si el último avance está en revisión', () => {
      baseContext.isStudent = true;
      baseContext.isLatestAdvancePending = true;

      const buttons = AdvancesTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Avance en revisión');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar y cambiar el label si hay entrega final (tiene prioridad)', () => {
      baseContext.isStudent = true;
      baseContext.isLatestAdvancePending = true;
      baseContext.hasFinalDelivery = true;

      const buttons = AdvancesTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Entrega final registrada');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar el botón si la tesis está suspendida o cancelada', () => {
      baseContext.isStudent = true;
      baseContext.isSuspendedOrCanceled = true;

      const buttons = AdvancesTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].disabled).toBe(true);
    });

    it('NO debe retornar botón si el usuario no es estudiante ni admin', () => {
      baseContext.isDirector = true;
      baseContext.isStudent = false;
      baseContext.isAdmin = false;

      const buttons = AdvancesTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toHaveLength(0);
    });
  });
});
