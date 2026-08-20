import { CorrespondenceTabConfig } from './correspondence.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';

describe('CorrespondenceTabConfig', () => {
  let baseContext: ThesisEvaluationContext;

  beforeEach(() => {
    // Usamos Partial<T> para construir mocks limpios y seguros sin recurrir a 'any'
    const mockUser: Partial<User> = { id: 'user-1' };

    const mockThesisWork: Partial<ThesisWork> = {
      thesisWorkId: 'thesis-1',
      documents: []
    };

    // Contexto base restaurado antes de cada prueba
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
      expect(CorrespondenceTabConfig.tabValue).toBe('CORRESPONDENCIA');
      expect(CorrespondenceTabConfig.headerActionRoute).toBe('register_correspondence');
      expect(CorrespondenceTabConfig.columns).toHaveLength(4);
    });
  });

  describe('enrichEvaluationContext', () => {
    it('debe retornar el contexto original si no hay thesisWork', () => {
      baseContext.thesisWork = null;
      const result = CorrespondenceTabConfig.enrichEvaluationContext!(baseContext);
      expect(result).toEqual(baseContext);
    });

    it('debe asignar hasCorrespondence en false si no existen documentos de tipo FORMATO_H', () => {
      const mockDoc: Partial<FileDocument> = { type: DocumentType.FORMATO_E };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        documents: [mockDoc as FileDocument]
      } as ThesisWork;

      const result = CorrespondenceTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasCorrespondence).toBe(false);
    });

    it('debe asignar hasCorrespondence en true si existe un documento de tipo FORMATO_H', () => {
      const mockDoc: Partial<FileDocument> = { type: DocumentType.FORMATO_H };

      baseContext.thesisWork = {
        ...baseContext.thesisWork,
        documents: [mockDoc as FileDocument]
      } as ThesisWork;

      const result = CorrespondenceTabConfig.enrichEvaluationContext!(baseContext);
      expect(result.hasCorrespondence).toBe(true);
    });
  });

  describe('getTableData', () => {
    it('debe retornar un array vacío si no se envían documentos (falsy)', () => {
      // Inyectamos un undefined deliberadamente para probar la programación defensiva (if (!documents))
      const invalidInput = undefined as unknown as FileDocument[];
      const rows = CorrespondenceTabConfig.getTableData!(invalidInput, baseContext);
      expect(rows).toEqual([]);
    });

    it('debe retornar un array vacío si no hay documentos de tipo FORMATO_H', () => {
      const mockDoc: Partial<FileDocument> = { type: DocumentType.AVANCE };
      const rows = CorrespondenceTabConfig.getTableData!([mockDoc as FileDocument], baseContext);
      expect(rows).toEqual([]);
    });

    it('debe filtrar y mapear correctamente los documentos de correspondencia (FORMATO_H)', () => {
      const mockDocH: Partial<FileDocument> = {
        id: 'doc-1',
        name: 'Resolucion 123',
        type: DocumentType.FORMATO_H,
        uploadDate: new Date('2026-08-01'),
        status: stateList.EN_REVISION,
        url: 'http://docs/res'
      };
      const mockDocOther: Partial<FileDocument> = { type: DocumentType.AVANCE };

      const rows = CorrespondenceTabConfig.getTableData!(
        [mockDocH as FileDocument, mockDocOther as FileDocument],
        baseContext
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('doc-1');
      expect(rows[0].name).toBe('Resolucion 123');
      expect(rows[0].url).toBe('http://docs/res');
      expect(rows[0].status).toBe(stateList.EN_REVISION);
      expect(rows[0].date).toEqual(new Date('2026-08-01'));
      expect(rows[0].allowedActions).toContain('view-details');
    });

    it('debe aplicar valores por defecto si el documento no tiene uploadDate o status', () => {
      const mockDoc: Partial<FileDocument> = {
        id: 'doc-2',
        name: 'Resolucion Sin Fecha',
        type: DocumentType.FORMATO_H,
        url: 'http://docs/res2'
        // Faltan uploadDate y status deliberadamente
      };

      const rows = CorrespondenceTabConfig.getTableData!([mockDoc as FileDocument], baseContext);

      expect(rows).toHaveLength(1);
      expect(rows[0].date).toBe('Sin fecha');
      expect(rows[0].status).toBe(stateList.APROBADO);
    });
  });

  describe('getHeaderButtons', () => {
    it('debe retornar array vacío si la tesis está archivada', () => {
      baseContext.isArchived = true;
      baseContext.isJuror = true;
      const buttons = CorrespondenceTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar array vacío si el usuario NO es jurado', () => {
      baseContext.isJuror = false;
      const buttons = CorrespondenceTabConfig.getHeaderButtons!(baseContext);
      expect(buttons).toEqual([]);
    });

    it('debe retornar el botón habilitado "Registrar Correspondencia" si es jurado y NO hay correspondencia', () => {
      baseContext.isJuror = true;
      baseContext.hasCorrespondence = false;

      const buttons = CorrespondenceTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Registrar Correspondencia');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[0].action).toBe('register_correspondence');
    });

    it('debe retornar el botón deshabilitado "Correspondencia Registrada" si es jurado y YA existe correspondencia', () => {
      baseContext.isJuror = true;
      baseContext.hasCorrespondence = true;

      const buttons = CorrespondenceTabConfig.getHeaderButtons!(baseContext);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Correspondencia Registrada');
      expect(buttons[0].disabled).toBe(true);
    });
  });
});
