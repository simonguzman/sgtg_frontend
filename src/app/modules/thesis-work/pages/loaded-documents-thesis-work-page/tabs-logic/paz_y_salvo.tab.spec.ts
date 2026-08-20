import { PazYSalvoTabConfig } from './paz_y_salvo.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { FinalDelivery } from '../../../interfaces/final-delivery.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

// Mockeamos la función de fechas
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn().mockReturnValue('fecha-formateada-mock')
}));

// Inferimos el tipo de un elemento individual del arreglo pazYSalvos
// directamente de la interfaz ThesisWork para no usar 'any'
type PazYSalvoItem = NonNullable<ThesisWork['pazYSalvos']>[number];

describe('PazYSalvoTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockUser: Partial<User> = { id: 'user-1' };

    const mockThesisWork: Partial<ThesisWork> = {
      thesisWorkId: 'thesis-1',
      state: stateList.EN_DESARROLLO,
      finalDeliveries: [],
      pazYSalvos: []
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
      expect(PazYSalvoTabConfig.tabValue).toBe('PAZ_Y_SALVO');
      expect(PazYSalvoTabConfig.headerActionRoute).toBe('register_paz_y_salvo');
      expect(PazYSalvoTabConfig.columns).toHaveLength(4);
      expect(PazYSalvoTabConfig.modalConfig?.uploadDocumentType).toBe(DocumentType.PAZ_Y_SALVO);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = PazYSalvoTabConfig.enrichEvaluationContext!(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe detectar hasActiveFinalDelivery correctamente', () => {
      // Caso Falso: solo entregas NO_APROBADO
      const mockDeliveryNoAprobado: Partial<FinalDelivery> = { status: stateList.NO_APROBADO };
      baseContext.thesisWork!.finalDeliveries = [mockDeliveryNoAprobado as FinalDelivery];

      let result = PazYSalvoTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasActiveFinalDelivery).toBe(false);

      // Caso Verdadero: al menos una entrega activa
      const mockDeliveryEnRevision: Partial<FinalDelivery> = { status: stateList.EN_REVISION };
      baseContext.thesisWork!.finalDeliveries = [mockDeliveryEnRevision as FinalDelivery];

      result = PazYSalvoTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasActiveFinalDelivery).toBe(true);
    });

    it('debe detectar hasApprovedPazYSalvo correctamente sin usar any', () => {
      // Caso Falso: estado en revisión
      const mockPysEnRevision: Partial<PazYSalvoItem> = {
        document: { status: stateList.EN_REVISION } as FileDocument
      };
      baseContext.thesisWork!.pazYSalvos = [mockPysEnRevision as PazYSalvoItem];

      let result = PazYSalvoTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasApprovedPazYSalvo).toBe(false);

      // Caso Verdadero: estado aprobado
      const mockPysAprobado: Partial<PazYSalvoItem> = {
        document: { status: stateList.APROBADO } as FileDocument
      };
      baseContext.thesisWork!.pazYSalvos = [mockPysAprobado as PazYSalvoItem];

      result = PazYSalvoTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasApprovedPazYSalvo).toBe(true);
    });

    it('debe detectar isSuspendedOrCanceled correctamente', () => {
      baseContext.thesisWork!.state = stateList.SUSPENDIDO;
      let result = PazYSalvoTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);

      baseContext.thesisWork!.state = stateList.CANCELADO;
      result = PazYSalvoTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.isSuspendedOrCanceled).toBe(true);
    });
  });

  describe('getTableData', () => {
    it('debe filtrar los documentos y solo retornar los de tipo PAZ_Y_SALVO', () => {
      const docs: FileDocument[] = [
        { id: 'doc-1', type: DocumentType.PAZ_Y_SALVO } as Partial<FileDocument> as FileDocument,
        { id: 'doc-2', type: DocumentType.FORMATO_E } as Partial<FileDocument> as FileDocument
      ];

      const rows = PazYSalvoTabConfig.getTableData!(docs, baseContext);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('doc-1');
    });

    it('debe formatear la fecha correctamente si es un objeto Date', () => {
      const dateObj = new Date('2026-08-01');
      const docs: FileDocument[] = [
        { type: DocumentType.PAZ_Y_SALVO, uploadDate: dateObj } as Partial<FileDocument> as FileDocument
      ];

      const rows = PazYSalvoTabConfig.getTableData!(docs, baseContext);
      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(formatThesisDate).toHaveBeenCalledWith(dateObj);
    });

    it('debe parsear y formatear la fecha correctamente si viene como string', () => {
      const dateString = '2026-08-01T00:00:00Z';
      const docs: FileDocument[] = [
        { type: DocumentType.PAZ_Y_SALVO, uploadDate: dateString } as Partial<FileDocument> as FileDocument
      ];

      const rows = PazYSalvoTabConfig.getTableData!(docs, baseContext);

      expect(rows[0].uploadDate).toBe('fecha-formateada-mock');
      expect(formatThesisDate).toHaveBeenCalledWith(expect.any(Date));
    });

    it('debe asignar "Sin fecha" y estado EN_REVISION si los datos faltan', () => {
      const docs: FileDocument[] = [
        { type: DocumentType.PAZ_Y_SALVO } as Partial<FileDocument> as FileDocument
      ];

      const rows = PazYSalvoTabConfig.getTableData!(docs, baseContext);

      expect(rows[0].uploadDate).toBe('Sin fecha');
      expect(rows[0].status).toBe(stateList.EN_REVISION);
      expect(rows[0].url).toBe('');
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si está archivado', () => {
      baseContext.isArchived = true;
      baseContext.isDecanatura = true; // Aún con permisos
      const buttons = PazYSalvoTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar array vacío si el usuario no es Decanatura ni Admin', () => {
      baseContext.isDecanatura = false;
      baseContext.isAdmin = false;
      const buttons = PazYSalvoTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar botón habilitado "Registrar Paz y Salvo" si todo es válido', () => {
      baseContext.isDecanatura = true;
      baseContext.hasActiveFinalDelivery = true;
      baseContext.hasApprovedPazYSalvo = false;
      baseContext.isSuspendedOrCanceled = false;

      const buttons = PazYSalvoTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Registrar Paz y Salvo');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_paz_y_salvo');
    });

    it('debe cambiar el label y deshabilitar si NO hay entrega final activa', () => {
      baseContext.isAdmin = true;
      baseContext.hasActiveFinalDelivery = false; // Faltante

      const buttons = PazYSalvoTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Requiere Entrega Final');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe cambiar el label y deshabilitar si YA hay un Paz y Salvo aprobado', () => {
      baseContext.isDecanatura = true;
      baseContext.hasActiveFinalDelivery = true;
      baseContext.hasApprovedPazYSalvo = true; // Ya existe

      const buttons = PazYSalvoTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Paz y Salvo Registrado');
      expect(buttons[0].disabled).toBe(true);
    });

    it('debe deshabilitar el botón si la tesis está suspendida o cancelada sin importar lo demás', () => {
      baseContext.isDecanatura = true;
      baseContext.hasActiveFinalDelivery = true;
      baseContext.hasApprovedPazYSalvo = false;
      baseContext.isSuspendedOrCanceled = true; // Bloqueante

      const buttons = PazYSalvoTabConfig.getHeaderButtons!(baseContext);

      expect(buttons[0].label).toBe('Registrar Paz y Salvo'); // Conserva la semántica
      expect(buttons[0].disabled).toBe(true); // Bloquea la acción
    });
  });
});
