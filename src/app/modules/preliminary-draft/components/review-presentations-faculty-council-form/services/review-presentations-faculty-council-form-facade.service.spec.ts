import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ReviewPresentationsFacultyCouncilFormFacadeService } from './review-presentations-faculty-council-form-facade.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

describe('ReviewPresentationsFacultyCouncilFormFacadeService', () => {
  let facade: ReviewPresentationsFacultyCouncilFormFacadeService;
  let mockUserService: jest.Mocked<Partial<UserService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;

  const mockDraft = {
    id: 'draft-1',
    state: stateList.EN_DESARROLLO,
    evaluations: [
      {
        veredict: stateList.APROBADO,
        signedDocuments: ['evaluacion_firmada.pdf'],
        evaluatorName: 'Docente Evaluador'
      }
    ],
    documents: [
      { id: 'doc-1', type: 'Anteproyecto', name: 'Documento V1.pdf', uploadDate: '2026-07-23' }
    ],
    proposalData: {
      authors: [{ id: 'user-1' }, { id: 'user-2' }],
      director: { id: 'dir-1' },
      evaluations: [
        {
          veredict: stateList.APROBADO,
          signedDocuments: ['evaluacion_firmada.pdf'],
          evaluatorName: 'Docente Evaluador'
        }
      ]
    }
  } as unknown as PreliminaryDraft;

  beforeEach(() => {
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

  describe('Estados Computados (Computed Signals)', () => {
    beforeEach(() => {
      facade.draft.set(mockDraft);
    });

    it('isReadOnly debería ser true si el estado es APROBADO', () => {
      facade.draft.set({ ...mockDraft, state: stateList.APROBADO } as unknown as PreliminaryDraft);
      expect(facade.isReadOnly()).toBeTruthy();
    });

    it('approvedPreliminaryDraftDocument debería retornar el documento tipo Anteproyecto', () => {
      const doc = facade.approvedPreliminaryDraftDocument();
      expect(doc?.name).toBe('Documento V1.pdf');
    });

    it('evaluationFiles debería listar las evaluaciones aprobadas con su evaluador', () => {
      const evalFiles = facade.evaluationFiles();
      expect(evalFiles).toHaveLength(1);
      expect(evalFiles[0].name).toBe('evaluacion_firmada.pdf');
      expect(evalFiles[0].evaluator).toBe('Docente Evaluador');
    });

    it('signedProposalDocument debería construir un FileDocument si existe evaluación aprobada', () => {
      const signedDoc = facade.signedProposalDocument();
      expect(signedDoc).toBeTruthy();
      expect(signedDoc?.type).toBe(DocumentType.FORMATO_C);
      expect(signedDoc?.name).toBe('evaluacion_firmada.pdf');
    });
  });

  describe('Lógica del Formulario (initFormEffects)', () => {
    beforeEach(() => {
      facade.draft.set(mockDraft);

      TestBed.runInInjectionContext(() => {
        facade.initFormEffects();
      });

      TestBed.flushEffects();
    });

    it('debería requerir maximumDeliveryDate si el result es "Aprobado"', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado' });

      const dateControl = facade.evaluationForm.get('maximumDeliveryDate');
      expect(dateControl?.hasValidator).toBeTruthy();
      expect(dateControl?.valid).toBeFalsy();
    });

    it('NO debería requerir maximumDeliveryDate si el result NO es "Aprobado"', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado' });
      facade.evaluationForm.patchValue({ result: 'No aprobado' });

      const dateControl = facade.evaluationForm.get('maximumDeliveryDate');
      expect(dateControl?.valid).toBeTruthy();
      expect(dateControl?.value).toBeNull();
    });

    it('debería deshabilitar el formulario si isReadOnly es true', () => {
      // 1. Modificamos el estado a APROBADO
      facade.draft.set({ ...mockDraft, state: stateList.APROBADO } as unknown as PreliminaryDraft);

      // 2. Volvemos a invocar initFormEffects() para que evalúe el IF con el nuevo estado
      TestBed.runInInjectionContext(() => {
        facade.initFormEffects();
      });

      // 3. Comprobamos
      expect(facade.isReadOnly()).toBeTruthy();
      expect(facade.evaluationForm.disabled).toBeTruthy();
    });
  });

  describe('Resolución de Nombres', () => {
    beforeEach(() => {
      facade.draft.set(mockDraft);
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
      expect(payload?.formValues.result).toBe('No aprobado');
      expect(payload?.file).toEqual(mockFile);
    });
  });
});
