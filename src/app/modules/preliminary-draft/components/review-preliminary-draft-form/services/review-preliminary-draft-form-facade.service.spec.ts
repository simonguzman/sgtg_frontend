import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

import { ReviewPreliminaryDraftFormFacadeService } from './review-preliminary-draft-form-facade.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../../users/interfaces/user.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

// Factory estricto para crear stubs de PreliminaryDraft sin usar 'as unknown'
const createMockPreliminaryDraft = (overrides?: Partial<PreliminaryDraft>): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.EN_DESARROLLO,
  documents: [
    {
      id: 'doc-1',
      name: 'Doc V1',
      uploadDate: '2026-05-01',
      type: DocumentType.ANTEPROYECTO,
      url: 'url1',
      status: stateList.EN_DESARROLLO
    } as FileDocument,
    {
      id: 'doc-2',
      name: 'Doc V2',
      uploadDate: '2026-05-15',
      type: DocumentType.ANTEPROYECTO,
      url: 'url2',
      status: stateList.EN_DESARROLLO
    } as FileDocument
  ],
  proposalData: {
    id: 'prop-1',
    title: 'Sistema de Gestión',
    authors: ['user-1', 'user-2'],
    director: { id: 'dir-1' } as User,
    codirector: { id: 'codir-1' } as User,
    advisor: { id: 'adv-1' } as User
  } as unknown as Proposal,
  evaluators: [],
  createdData: new Date(),
  ...overrides
} as PreliminaryDraft);

describe('ReviewPreliminaryDraftFormFacadeService', () => {
  let facade: ReviewPreliminaryDraftFormFacadeService;

  // Mocks tipados estrictamente
  let mockUserService: {
    getAuthorsNames: jest.Mock;
    getUserFullName: jest.Mock;
  };

  let mockNotificationService: {
    show: jest.Mock;
  };

  const mockDraft = createMockPreliminaryDraft();

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
        ReviewPreliminaryDraftFormFacadeService,
        FormBuilder,
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    facade = TestBed.inject(ReviewPreliminaryDraftFormFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente el servicio facade', () => {
    expect(facade).toBeTruthy();
  });

  describe('Estado Calculado (Computed Signals)', () => {
    it('isReadOnly debería retornar true solo cuando el estado sea APROBADO', () => {
      facade.preliminaryDraft.set(createMockPreliminaryDraft({ state: stateList.APROBADO }));
      expect(facade.isReadOnly()).toBe(true);

      facade.preliminaryDraft.set(mockDraft);
      expect(facade.isReadOnly()).toBe(false);
    });

    it('currentDocument debería ordenar y retornar el documento con la fecha más reciente', () => {
      facade.preliminaryDraft.set(mockDraft);

      const current = facade.currentDocument();
      expect(current?.name).toBe('Doc V2');
    });

    it('currentDocument debería retornar null si el arreglo de documentos está vacío o no existe', () => {
      facade.preliminaryDraft.set(createMockPreliminaryDraft({ documents: [] }));
      expect(facade.currentDocument()).toBeNull();

      facade.preliminaryDraft.set(null);
      expect(facade.currentDocument()).toBeNull();
    });

    it('documentUploadDate debería formatear la fecha correctamente o retornar "No disponible"', () => {
      facade.preliminaryDraft.set(mockDraft);
      expect(facade.documentUploadDate()).not.toBe('No disponible');

      facade.preliminaryDraft.set(createMockPreliminaryDraft({ documents: [] }));
      expect(facade.documentUploadDate()).toBe('No disponible');
    });
  });

  describe('Resolución de Nombres de Usuarios', () => {
    beforeEach(() => {
      facade.preliminaryDraft.set(mockDraft);
    });

    it('debería obtener los nombres completos de los estudiantes/autores', () => {
      expect(facade.getStudentNames()).toBe('Estudiante 1, Estudiante 2');
      expect(mockUserService.getAuthorsNames).toHaveBeenCalledWith(['user-1', 'user-2']);
    });

    it('debería obtener los nombres del director, codirector y asesor correctamente', () => {
      expect(facade.getDirectorName()).toBe('Nombre de dir-1');
      expect(facade.getCodirectorName()).toBe('Nombre de codir-1');
      expect(facade.getAdvisorName()).toBe('Nombre de adv-1');
      expect(mockUserService.getUserFullName).toHaveBeenCalledTimes(3);
    });

    it('debería retornar cadena vacía si faltan roles o datos de la propuesta', () => {
      // 1. Sobrescribir el mock para que retorne vacío en esta prueba
      mockUserService.getAuthorsNames.mockReturnValue('');

      // 2. Setear la señal con el mock sin autores ni roles
      facade.preliminaryDraft.set(createMockPreliminaryDraft({
        proposalData: { authors: [] } as Partial<Proposal> as Proposal
      }));

      // 3. Afirmaciones
      expect(facade.getStudentNames()).toBe('');
      expect(facade.getDirectorName()).toBe('');
      expect(facade.getCodirectorName()).toBe('');
      expect(facade.getAdvisorName()).toBe('');
    });
  });

  describe('Manejo de Modales y Carga de Archivos', () => {
    const mockFile = new File(['contenido'], 'formato_b.pdf', { type: 'application/pdf' });
    const mockAnnotatedFile = new File(['anotaciones'], 'revision_anotada.pdf', { type: 'application/pdf' });
    const mockEvent = { fileName: 'formato_b.pdf', file: mockFile };
    const mockAnnotatedEvent = { fileName: 'revision_anotada.pdf', file: mockAnnotatedFile };

    it('handleFileUploaded debería actualizar el archivo firmado y cerrar el modal', () => {
      facade.isUploadModalOpen.set(true);
      facade.handleFileUploaded(mockEvent);

      expect(facade.uploadedSignedFile()).toEqual(mockEvent);
      expect(facade.isUploadModalOpen()).toBe(false);
    });

    it('handleAnnotatedFileUploaded debería registrar el archivo anotado, cerrar el modal y mostrar notificación', () => {
      facade.isAnnotatedUploadModalOpen.set(true);
      facade.handleAnnotatedFileUploaded(mockAnnotatedEvent);

      expect(facade.uploadedAnnotatedFile()).toEqual(mockAnnotatedEvent);
      expect(facade.isAnnotatedUploadModalOpen()).toBe(false);
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Feedback adjunto',
        message: 'El documento con anotaciones se ha cargado correctamente.',
        type: NotificationType.INFO
      });
    });
  });

  describe('Validaciones del Formulario y Generación de Payload', () => {
    const mockFile = new File([''], 'test.pdf');
    const mockEvent = { fileName: 'test.pdf', file: mockFile };

    it('isFieldInvalid debería identificar controles inválidos y tocados', () => {
      const resultControl = facade.evaluationForm.get('result');

      expect(facade.isFieldInvalid('result')).toBe(false);

      resultControl?.markAsTouched();
      expect(facade.isFieldInvalid('result')).toBe(true);

      resultControl?.setValue('Aprobado');
      expect(facade.isFieldInvalid('result')).toBe(false);
    });

    it('debería retornar null y notificar error si el formulario de evaluación está incompleto', () => {
      facade.uploadedSignedFile.set(mockEvent);

      const payload = facade.validateAndGetPayload();

      expect(payload).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        message: 'Por favor, complete el veredicto y las observaciones.'
      }));
    });

    it('debería retornar null y notificar error si falta el archivo firmado (Formato B)', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Excelente trabajo' });

      const payload = facade.validateAndGetPayload();

      expect(payload).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        message: 'Debe adjuntar el Formato B firmado para guardar la evaluación.'
      }));
    });

    it('debería retornar null si el veredicto enviado no existe en el mapa RESULT_TO_STATE', () => {
      facade.evaluationForm.patchValue({ result: 'OpcionInexistente', comments: 'Comentario' });
      facade.uploadedSignedFile.set(mockEvent);

      const payload = facade.validateAndGetPayload();

      expect(payload).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        message: 'Por favor, complete el veredicto y las observaciones.'
      }));
    });

    it('debería retornar un PendingReviewData válido mapeando correctamente el veredicto a enum', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Aprobado con observaciones' });
      facade.uploadedSignedFile.set(mockEvent);

      const payload = facade.validateAndGetPayload();

      expect(payload).toEqual({
        formValues: {
          result: stateList.APROBADO,
          comments: 'Aprobado con observaciones'
        },
        file: mockFile,
        annotatedFile: undefined
      });
    });

    it('debería incluir el archivo anotado en el payload si está disponible', () => {
      const mockAnnotatedFile = new File([''], 'anotado.pdf');
      facade.evaluationForm.patchValue({ result: 'No aprobado', comments: 'Requiere ajustes' });
      facade.uploadedSignedFile.set(mockEvent);
      facade.uploadedAnnotatedFile.set({ fileName: 'anotado.pdf', file: mockAnnotatedFile });

      const payload = facade.validateAndGetPayload();

      expect(payload).toEqual({
        formValues: {
          result: stateList.NO_APROBADO,
          comments: 'Requiere ajustes'
        },
        file: mockFile,
        annotatedFile: mockAnnotatedFile
      });
    });
  });
});
