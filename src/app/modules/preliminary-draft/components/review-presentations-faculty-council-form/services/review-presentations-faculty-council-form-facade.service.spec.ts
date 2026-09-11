import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';

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

// 🔹 REFACTOR: Fábricas de Datos (Factories) para generar entidades estrictas sin 'unknown' ni 'any'
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
  evaluations: [createMockEvaluation()],
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

  // 🔹 REFACTOR: Tipado estricto para los mocks de servicios
  let mockUserService: { getAuthorsNames: jest.Mock; getUserFullName: jest.Mock };
  let mockNotificationService: { show: jest.Mock };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
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
    jest.restoreAllMocks(); // 🧹 Restaurar consola
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

    it('evaluationFiles debería listar las evaluaciones aprobadas con su evaluador', () => {
      const evalFiles = facade.evaluationFiles();
      expect(evalFiles).toHaveLength(1);
      expect(evalFiles[0].name).toBe('evaluacion_firmada.pdf');
      expect(evalFiles[0].evaluator).toBe('Docente Evaluador');
    });

    it('signedProposalDocument debería construir un FormattedDocument si existe evaluación aprobada', () => {
      const signedDoc = facade.signedProposalDocument();
      expect(signedDoc).toBeTruthy();
      expect(signedDoc?.name).toBe('evaluacion_firmada.pdf');
      expect(signedDoc?.url).toBe('http://mock-url.com');
    });

    it('documentUploadDate debería formatear correctamente la fecha del primer documento', () => {
      const uploadDateStr = facade.documentUploadDate();
      // Ya que hemos seteado el mock de fecha explícitamente a 2026-07-23
      expect(uploadDateStr).toMatch(/23.*7.*2026|23\/7\/2026|23\/07\/2026/); // Expresión regular flexible para los formatos locales (es-ES)
    });
  });

  describe('Lógica del Formulario (initFormEffects)', () => {
    beforeEach(() => {
      facade.preliminaryDraft.set(createMockDraft());
      facade.initFormEffects();
    });

    it('debería requerir maximumDeliveryDate si el result es "Aprobado"', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado' });

      const dateControl = facade.evaluationForm.get('maximumDeliveryDate');
      expect(dateControl?.valid).toBeFalsy();
    });

    it('NO debería requerir maximumDeliveryDate si el result NO es "Aprobado"', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado' }); // Seteamos uno
      facade.evaluationForm.patchValue({ result: 'No aprobado' }); // Cambiamos al otro

      const dateControl = facade.evaluationForm.get('maximumDeliveryDate');
      expect(dateControl?.valid).toBeTruthy();
      expect(dateControl?.value).toBeNull();
    });

    it('debería deshabilitar el formulario si isReadOnly es true', () => {
      // Recreamos el caso de solo lectura
      facade.preliminaryDraft.set(createMockDraft({ state: stateList.APROBADO }));

      // Reinicializamos los efectos
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

      // Al no enviar codirector ni asesor en el mock por defecto, deben devolver cadena vacía
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
});
