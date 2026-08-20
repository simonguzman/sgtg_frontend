import { SustentationTabConfig } from './sustentation.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';

// Inferencia inteligente de tipos para evitar dependencias innecesarias de interfaces no exportadas
type SustentationItem = NonNullable<ThesisWork['sustentations']>[number];
type JurorItem = NonNullable<SustentationItem['assignedJurors']>[number];

describe('SustentationTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockUser: Partial<User> = { id: 'juror-1' };

    const mockThesisWork: Partial<ThesisWork> = {
      thesisWorkId: 'thesis-1',
      documents: [],
      sustentations: [],
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
      thesisWork: mockThesisWork as ThesisWork,
      hasApprovedPazYSalvo: false,
      hasSustentationRegistered: false,
      isSustentationEvaluated: false
    };
  });

  describe('Propiedades Estáticas', () => {
    it('debe tener la configuración inicial correcta', () => {
      expect(SustentationTabConfig.tabValue).toBe('SUSTENTACION');
      expect(SustentationTabConfig.headerActionRoute).toBe('register_sustentation');
      expect(SustentationTabConfig.columns).toHaveLength(4);
      expect(SustentationTabConfig.modalConfig?.uploadDocumentType).toBe(DocumentType.FORMATO_E);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto base si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = SustentationTabConfig.enrichEvaluationContext!(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe evaluar correctamente hasApprovedPazYSalvo', () => {
      const mockDocument: Partial<FileDocument> = {
        type: DocumentType.PAZ_Y_SALVO,
        status: stateList.APROBADO
      };
      baseContext.thesisWork!.documents = [mockDocument as FileDocument];

      const result = SustentationTabConfig.enrichEvaluationContext!(baseContext);

      expect(result.hasApprovedPazYSalvo).toBe(true);
    });

    it('debe validar si el usuario actual es jurado de la sustentación activa', () => {
      const mockJuror: Partial<JurorItem> = { id: 'juror-1' };
      const mockSustentation: Partial<SustentationItem> = {
        assignedJurors: [mockJuror as JurorItem]
      };

      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.enrichEvaluationContext!(baseContext);

      expect(result.isJuror).toBe(true);
      expect(result.hasSustentationRegistered).toBe(true);
    });

    it('debe validar que isSustentationEvaluated sea true si tiene veredictos', () => {
      const mockVerdict: Partial<JurorVerdict> = { veredict: stateList.APROBADO };
      const mockSustentation: Partial<SustentationItem> = {
        verdicts: [mockVerdict as JurorVerdict]
      };

      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.enrichEvaluationContext!(baseContext);

      expect(result.isSustentationEvaluated).toBe(true);
    });
  });

  describe('getTableData (y resolveDisplayStatus)', () => {
    const dummyDocs: FileDocument[] = [];

    it('debe retornar array vacío si no hay sustentaciones', () => {
      // Sustituimos 'as any' usando manipulación segura a través de un Partial
      const thesisPartial: Partial<ThesisWork> = baseContext.thesisWork as Partial<ThesisWork>;
      thesisPartial.sustentations = [];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);
      expect(result).toEqual([]);
    });

    it('debe mostrar estado CANCELADO y fecha pendiente si es el caso', () => {
      const mockSustentation: Partial<SustentationItem> = {
        id: 'sus-1',
        status: SustentationStatus.CANCELADA,
        sustentationDate: undefined
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.CANCELADO);
      expect(result[0].date).toBe('Fecha pendiente');
      expect(result[0].allowedActions).toEqual(['view_sustentation_details']);
    });

    it('debe mostrar estado APLAZADO y formatear fecha si es aplazada administrativamente', () => {
      const dateRaw = new Date('2026-08-03T10:00:00Z');
      const mockSustentation: Partial<SustentationItem> = {
        id: 'sus-2',
        status: SustentationStatus.APLAZADA,
        sustentationDate: dateRaw
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.APLAZADO);
      expect(result[0].date).toBe(dateRaw.toLocaleDateString('es-ES'));
    });

    it('debe mostrar EN_REVISION si no tiene veredictos', () => {
      const mockSustentation: Partial<SustentationItem> = {
        id: 'sus-3',
        verdicts: []
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.EN_REVISION);
    });

    it('debe mostrar APROBADO_CON_OBSERVACIONES si hubo observaciones y el último es APROBADO', () => {
      const mockSustentation: Partial<SustentationItem> = {
        id: 'sus-4',
        verdicts: [
          { veredict: stateList.APROBADO_CON_OBSERVACIONES } as Partial<JurorVerdict> as JurorVerdict,
          { veredict: stateList.APROBADO } as Partial<JurorVerdict> as JurorVerdict
        ]
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.APROBADO_CON_OBSERVACIONES);
    });

    it('debe mostrar el último veredicto si es diferente a las reglas de observación', () => {
      const mockSustentation: Partial<SustentationItem> = {
        id: 'sus-5',
        verdicts: [
          { veredict: stateList.APROBADO_CON_OBSERVACIONES } as Partial<JurorVerdict> as JurorVerdict,
          { veredict: stateList.NO_APROBADO } as Partial<JurorVerdict> as JurorVerdict
        ]
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);

      expect(result[0].status).toBe(stateList.NO_APROBADO);
    });

    it('debe añadir acción evaluate_sustentation para Admin o Jurado en estado valido', () => {
      baseContext.isAdmin = true;
      baseContext.isArchived = false;
      const mockSustentation: Partial<SustentationItem> = {
        id: 'sus-6',
        status: SustentationStatus.PROGRAMADA,
        verdicts: []
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);

      expect(result[0].allowedActions).toContain('evaluate_sustentation');
    });

    it('NO debe añadir acción evaluate_sustentation si ya fue evaluado o aplazado', () => {
      baseContext.isAdmin = true;
      const mockSustentation: Partial<SustentationItem> = {
        id: 'sus-7',
        verdicts: [{ veredict: stateList.APROBADO } as Partial<JurorVerdict> as JurorVerdict]
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const result = SustentationTabConfig.getTableData!(dummyDocs, baseContext);

      expect(result[0].allowedActions).not.toContain('evaluate_sustentation');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar vacío si está archivado o no es Consejo', () => {
      baseContext.isArchived = true;
      baseContext.isConsejo = true;
      expect(SustentationTabConfig.getHeaderButtons!(baseContext)).toEqual([]);

      baseContext.isArchived = false;
      baseContext.isConsejo = false;
      expect(SustentationTabConfig.getHeaderButtons!(baseContext)).toEqual([]);
    });

    it('debe pedir Paz y Salvo si no lo tiene (Consejo)', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = false;

      const buttons = SustentationTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Requiere Paz y Salvo Aprobado');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe permitir Registrar Sustentación si hay Paz y Salvo y no hay sustentaciones', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = false;

      const buttons = SustentationTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Registrar Sustentación');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debe permitir Registrar Nueva Sustentación si fue APLAZADO en veredicto o estado administrativo', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = true;

      const mockSustentation: Partial<SustentationItem> = {
        status: SustentationStatus.APLAZADA
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const buttons = SustentationTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Registrar Nueva Sustentación');
      expect(buttons[0].disabled).toBe(false);
    });

    it('debe deshabilitar e indicar Sustentación Evaluada si ya terminó exitosamente o con otro veredicto final', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = true;
      baseContext.isSustentationEvaluated = true;

      const mockSustentation: Partial<SustentationItem> = {
        verdicts: [{ veredict: stateList.APROBADO } as Partial<JurorVerdict> as JurorVerdict]
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const buttons = SustentationTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Sustentación Evaluada');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar e indicar Sustentación Programada si no ha sido evaluada y está activa', () => {
      baseContext.isConsejo = true;
      baseContext.hasApprovedPazYSalvo = true;
      baseContext.hasSustentationRegistered = true;
      baseContext.isSustentationEvaluated = false;

      const mockSustentation: Partial<SustentationItem> = {
        status: SustentationStatus.PROGRAMADA,
        verdicts: []
      };
      baseContext.thesisWork!.sustentations = [mockSustentation as SustentationItem];

      const buttons = SustentationTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Sustentación Programada');
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
