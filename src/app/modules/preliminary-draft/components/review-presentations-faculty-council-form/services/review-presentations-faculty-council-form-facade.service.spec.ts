import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ReviewPresentationsFacultyCouncilFormFacadeService } from './review-presentations-faculty-council-form-facade.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { etiquetaDeRuta } from '../../../../../core/mappers/trabajo-grado.mapper';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  firstName: 'Nombre',
  lastName: 'Apellido',
  roles: [],
  ...overrides
} as User);

const createMockEvaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
  id: 'ev-1',
  proposalId: 'prop-1',
  documentId: 'doc-1',
  evaluatorId: 'eval-1',
  evaluatorName: 'Docente Evaluador',
  evaluatorRole: 'Evaluador',
  veredict: stateList.APROBADO,
  observations: '',
  date: new Date(),
  signedDocuments: [{ name: 'evaluacion_firmada.pdf', url: 'http://mock-url.com' }],
  ...overrides
} as Evaluation);

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'Documento V1',
  type: DocumentType.ANTEPROYECTO,
  url: 'http://mock-url.com',
  uploadDate: new Date('2026-07-23T00:00:00'),
  ...overrides
} as FileDocument);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Mock Proposal',
  authors: [createMockUser({ id: 'user-1' }), createMockUser({ id: 'user-2' })],
  director: createMockUser({ id: 'dir-1' }),
  // El concepto del Comité llega del mapper como Pertinente, con el Formato A firmado
  evaluations: [createMockEvaluation({
    evaluatorName: 'Comité de Programa', veredict: stateList.PERTINENTE,
    signedDocuments: [{ name: 'Formato A firmado', url: '/api/v1/sgtg/trabajos-grado/15/archivos/acta-comite/v1' }]
  })],
  ...overrides
} as Proposal);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  proposalData: createMockProposal(),
  state: stateList.EN_DESARROLLO,
  evaluations: [createMockEvaluation()],
  documents: [createMockFileDocument()],
  evaluators: [],
  createdData: new Date(),
  isArchived: false,
  ...overrides
} as PreliminaryDraft);

describe('ReviewPresentationsFacultyCouncilFormFacadeService', () => {
  let facade: ReviewPresentationsFacultyCouncilFormFacadeService;

  let mockUserService: { getAuthorsNames: jest.Mock; getUserFullName: jest.Mock };
  let mockNotificationService: { show: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Estudiante 1, Estudiante 2'),
      getUserFullName: jest.fn().mockImplementation((id: string) => `Nombre de ${id}`)
    };

    mockNotificationService = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ReviewPresentationsFacultyCouncilFormFacadeService,
        FormBuilder,
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    facade = TestBed.inject(ReviewPresentationsFacultyCouncilFormFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Estados Computados (Computed Signals)', () => {
    beforeEach(() => {
      facade.preliminaryDraft.set(createMockDraft());
    });

    it('isReadOnly debería ser true si el estado es APROBADO', () => {
      facade.preliminaryDraft.set(createMockDraft({ state: stateList.APROBADO }));
      expect(facade.isReadOnly()).toBeTruthy();
    });

    it('approvedPreliminaryDraftDocument debería retornar el documento tipo Anteproyecto', () => {
      const doc = facade.approvedPreliminaryDraftDocument();
      expect(doc?.name).toBe('Documento V1');
    });

    it('con varias versiones muestra la vigente, el último formato C y solo los conceptos sobre la vigente', () => {
      facade.preliminaryDraft.set(createMockDraft({
        documents: [
          createMockFileDocument({ id: 'v1', name: 'Anteproyecto', version: 1 }),
          createMockFileDocument({ id: 'v2', name: 'Anteproyecto - versión 2', version: 2 }),
          createMockFileDocument({ id: 'c1', name: 'Formato C', type: DocumentType.FORMATO_C, version: 1 }),
          createMockFileDocument({ id: 'c2', name: 'Formato C - versión 2', type: DocumentType.FORMATO_C, version: 2 })
        ],
        evaluations: [
          createMockEvaluation({ documentId: 'v1', evaluatorName: 'Sobre la versión 1' }),
          createMockEvaluation({ documentId: 'v2', evaluatorName: 'Sobre la versión 2' }),
          createMockEvaluation({ documentId: 'c1', evaluatorName: 'Consejo', evaluatorRole: 'Consejo' })
        ]
      }));

      expect(facade.approvedPreliminaryDraftDocument()?.name).toBe('Anteproyecto - versión 2');
      expect(facade.presentationDocument()?.name).toBe('Formato C - versión 2');
      expect(facade.evaluationFiles().map(file => file.evaluator)).toEqual(['Sobre la versión 2']);
    });

    it('los formatos B de los dos evaluadores se distinguen por su evaluador y cada uno conserva su archivo', () => {
      // El formato B de cada evaluador se guarda en su propia carpeta (v1, v2); ambos se llaman igual
      const formatoB = (carpeta: string) => ({ name: etiquetaDeRuta(`15/TI-B/${carpeta}/Formato B - ${carpeta}.pdf`),
        url: `/api/v1/sgtg/trabajos-grado/15/archivos/TI-B/${carpeta}` });
      facade.preliminaryDraft.set(createMockDraft({
        documents: [createMockFileDocument({ id: 'v1', name: 'Anteproyecto', version: 1 })],
        evaluations: [
          createMockEvaluation({ documentId: 'v1', evaluatorName: 'Ana Pérez', signedDocuments: [formatoB('v1')] }),
          createMockEvaluation({ documentId: 'v1', evaluatorName: 'Luis Gómez', signedDocuments: [formatoB('v2')] })
        ]
      }));

      expect(facade.evaluationFiles()).toEqual([
        { name: 'Formato B (concepto del evaluador)', url: '/api/v1/sgtg/trabajos-grado/15/archivos/TI-B/v1', evaluator: 'Ana Pérez' },
        { name: 'Formato B (concepto del evaluador)', url: '/api/v1/sgtg/trabajos-grado/15/archivos/TI-B/v2', evaluator: 'Luis Gómez' }
      ]);
    });

    it('muestra la carta de aceptación solo si la propuesta la tiene (práctica profesional)', () => {
      expect(facade.acceptanceLetter()).toBeUndefined();

      const carta = createMockFileDocument({ id: 'carta', name: 'Carta de aceptación', type: DocumentType.FORMATO });
      facade.preliminaryDraft.set(createMockDraft({ proposalData: createMockProposal({ documents: [carta] }) }));
      expect(facade.acceptanceLetter()).toBe(carta);
    });

    it('evaluationFiles debería listar las evaluaciones aprobadas con su evaluador', () => {
      const evalFiles = facade.evaluationFiles();
      expect(evalFiles).toHaveLength(1);
      expect(evalFiles[0].name).toBe('evaluacion_firmada.pdf');
      expect(evalFiles[0].evaluator).toBe('Docente Evaluador');
    });

    it('signedProposalDocument muestra el Formato A firmado del concepto pertinente del Comité, para descargarlo', () => {
      const signedDoc = facade.signedProposalDocument();
      expect(signedDoc?.name).toBe('Formato A firmado');
      expect(signedDoc?.url).toBe('/api/v1/sgtg/trabajos-grado/15/archivos/acta-comite/v1');
    });

    it('signedProposalDocument toma el concepto pertinente aunque antes hubo uno no pertinente', () => {
      const noPertinente = createMockEvaluation({
        veredict: stateList.NO_PERTINENTE, signedDocuments: [{ name: 'Formato A v1', url: '/v1' }]
      });
      const pertinente = createMockEvaluation({
        veredict: stateList.PERTINENTE, signedDocuments: [{ name: 'Formato A v2', url: '/v2' }]
      });
      facade.preliminaryDraft.set(createMockDraft({ proposalData: createMockProposal({ evaluations: [noPertinente, pertinente] }) }));
      expect(facade.signedProposalDocument()?.url).toBe('/v2');
    });

    it('signedProposalDocument no muestra nada si el Comité no ha emitido un concepto pertinente', () => {
      facade.preliminaryDraft.set(createMockDraft({ proposalData: createMockProposal({ evaluations: [] }) }));
      expect(facade.signedProposalDocument()).toBeUndefined();
    });

    it('documentUploadDate debería formatear correctamente la fecha del primer documento', () => {
      const uploadDateStr = facade.documentUploadDate();
      expect(uploadDateStr).toMatch(/23.*7.*2026|23\/7\/2026|23\/07\/2026/);
    });
  });

  describe('Lógica del Formulario (initFormEffects)', () => {
    beforeEach(() => {
      facade.preliminaryDraft.set(createMockDraft());
      facade.initFormEffects();
    });

    it('al aprobar exige la fecha de la reunión y la de entrega; la de entrega se habilita al elegir la reunión', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado' });
      const inicio = facade.evaluationForm.controls.startDate;
      const entrega = facade.evaluationForm.controls.endDate;
      expect(inicio.valid).toBe(false);
      expect(entrega.disabled).toBe(true);

      inicio.setValue(new Date(2027, 6, 23));
      expect(entrega.enabled).toBe(true);
      expect(entrega.valid).toBe(false);
      entrega.setValue(new Date(2028, 0, 23));
      expect(facade.evaluationForm.valid).toBe(false); // faltan las observaciones
      expect(inicio.valid && entrega.valid).toBe(true);
    });

    it('si no aprueba no pide fechas y limpia las elegidas', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado' });
      facade.evaluationForm.controls.startDate.setValue(new Date(2027, 6, 23));
      facade.evaluationForm.patchValue({ result: 'No aprobado' });

      expect(facade.evaluationForm.controls.startDate.value).toBeNull();
      expect(facade.evaluationForm.controls.startDate.valid).toBe(true);
      expect(facade.evaluationForm.controls.endDate.value).toBeNull();
    });

    it('debería deshabilitar el formulario si isReadOnly es true', () => {
      facade.preliminaryDraft.set(createMockDraft({ state: stateList.APROBADO }));

      facade.initFormEffects();

      expect(facade.isReadOnly()).toBeTruthy();
      expect(facade.evaluationForm.disabled).toBeTruthy();
    });
  });

  describe('Resolución de Nombres', () => {
    beforeEach(() => {
      facade.preliminaryDraft.set(createMockDraft());
    });

    it('debería resolver nombres de estudiantes, director, codirector y asesor', () => {
      expect(facade.getStudentNames()).toBe('Estudiante 1, Estudiante 2');
      expect(facade.getDirectorName()).toBe('Nombre de dir-1');

      expect(facade.getCodirectorName()).toBe('');
      expect(facade.getAdvisorName()).toBe('');
    });
  });

  describe('Manejo de Archivos y Validaciones (Payload)', () => {
    const mockFile = new File([''], 'resolucion.pdf');
    const mockFileEvent = { fileName: 'resolucion.pdf', file: mockFile };

    it('debería setear el archivo firmado y cerrar el modal', () => {
      facade.isUploadModalOpen.set(true);
      facade.handleFileUploaded(mockFileEvent);

      expect(facade.uploadedSignedFile()).toEqual(mockFileEvent);
      expect(facade.isUploadModalOpen()).toBeFalsy();
    });

    it('debería retornar null y mostrar error si el formulario es inválido', () => {
      facade.uploadedSignedFile.set(mockFileEvent);

      const payload = facade.validateAndGetPayload();

      expect(payload).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });

    it('debería retornar null y mostrar error específico si falta el archivo', () => {
      facade.evaluationForm.patchValue({ result: 'No aprobado', comments: 'Observación' });

      const payload = facade.validateAndGetPayload();

      expect(payload).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          message: 'Es obligatorio adjuntar el documento de evaluación firmado.'
        })
      );
    });

    it('debería retornar el payload si el formulario es válido y tiene archivo', () => {
      facade.evaluationForm.patchValue({ result: 'No aprobado', comments: 'Observación' });
      facade.uploadedSignedFile.set(mockFileEvent);

      const payload = facade.validateAndGetPayload();

      expect(payload).toBeTruthy();
      expect(payload?.formValues.result).toBe(stateList.NO_APROBADO);
      expect(payload?.file).toEqual(mockFile);
    });
  });

  describe('Plazo de ejecución que fija el Consejo', () => {
    // Hoy (backend): 28-jul-2027; remisión con el formato C: 20-jul-2027
    const term = { startMin: new Date(2027, 6, 20), startMax: new Date(2027, 6, 28), minMonths: 3, maxMonths: 9 };

    beforeEach(() => {
      facade.preliminaryDraft.set(createMockDraft({ councilTerm: term }));
      facade.initFormEffects();
      facade.evaluationForm.patchValue({ result: 'Aprobado' });
    });

    it('la reunión va de la remisión a hoy y la entrega de 3 a 9 meses después de la reunión elegida', () => {
      expect(facade.startDateMin()).toEqual(new Date(2027, 6, 20));
      expect(facade.startDateMax()).toEqual(new Date(2027, 6, 28));
      expect(facade.endDateMin()).toBeNull();
      expect(facade.endDateHint()).toBe('Primero elija la fecha de la reunión del Consejo.');

      facade.evaluationForm.controls.startDate.setValue(new Date(2027, 6, 23));
      expect(facade.endDateMin()).toEqual(new Date(2027, 9, 23));
      expect(facade.endDateMax()).toEqual(new Date(2028, 3, 23));
      expect(facade.endDateHint()).toBe('Entre el 23 - 10 - 2027 y el 23 - 04 - 2028 (de 3 a 9 meses).');
    });

    it('rechaza una reunión fuera del rango y una entrega de menos de 3 o más de 9 meses', () => {
      const inicio = facade.evaluationForm.controls.startDate;
      inicio.setValue(new Date(2027, 6, 29));
      expect(inicio.hasError('inicioFueraDeRango')).toBe(true);
      inicio.setValue(new Date(2027, 6, 19));
      expect(inicio.hasError('inicioFueraDeRango')).toBe(true);
      inicio.setValue(new Date(2027, 6, 23));
      expect(inicio.valid).toBe(true);

      const entrega = facade.evaluationForm.controls.endDate;
      entrega.setValue(new Date(2027, 9, 22));
      expect(entrega.hasError('entregaFueraDeRango')).toBe(true);
      entrega.setValue(new Date(2028, 3, 24));
      expect(entrega.hasError('entregaFueraDeRango')).toBe(true);
      entrega.setValue(new Date(2028, 3, 23));
      expect(entrega.valid).toBe(true);
    });

    it('muestra la duración del plazo y, si la reunión cambia y la entrega ya no cabe, la limpia', () => {
      facade.evaluationForm.controls.startDate.setValue(new Date(2027, 6, 23));
      facade.evaluationForm.controls.endDate.setValue(new Date(2028, 0, 23));
      expect(facade.termLength()).toBe('6 meses');
      facade.evaluationForm.controls.endDate.setValue(new Date(2028, 1, 2));
      expect(facade.termLength()).toBe('6 meses y 10 días');

      // Con la reunión el 20-jul la entrega máxima es el 20-abr: el 23-abr ya no cabe y se limpia
      facade.evaluationForm.controls.endDate.setValue(new Date(2028, 3, 23));
      facade.evaluationForm.controls.startDate.setValue(new Date(2027, 6, 20));
      expect(facade.evaluationForm.controls.endDate.value).toBeNull();
    });

    it('envía las dos fechas elegidas', () => {
      facade.evaluationForm.patchValue({ comments: 'Aprobado en sesión del jueves' });
      facade.evaluationForm.controls.startDate.setValue(new Date(2027, 6, 23));
      facade.evaluationForm.controls.endDate.setValue(new Date(2028, 0, 23));
      facade.handleFileUploaded({ fileName: 'resolucion.pdf', file: new File(['%PDF'], 'resolucion.pdf') });

      const payload = facade.validateAndGetPayload();
      expect(payload?.formValues.startDate).toEqual(new Date(2027, 6, 23));
      expect(payload?.formValues.endDate).toEqual(new Date(2028, 0, 23));
    });
  });
});
