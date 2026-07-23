import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ReviewPreliminaryDraftFormFacadeService } from './review-preliminary-draft-form-facade.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('ReviewPreliminaryDraftFormFacadeService', () => {
  let facade: ReviewPreliminaryDraftFormFacadeService;
  let mockUserService: jest.Mocked<Partial<UserService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;

  const mockDraft: PreliminaryDraft = {
    id: '1',
    state: stateList.EN_DESARROLLO,
    documents: [
      { name: 'Doc V1', uploadDate: '2026-05-01' },
      { name: 'Doc V2', uploadDate: '2026-05-15' }
    ],
    proposalData: {
      authors: ['user-1', 'user-2'],
      director: { id: 'dir-1' },
      codirector: { id: 'codir-1' },
      advisor: { id: 'adv-1' }
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
        ReviewPreliminaryDraftFormFacadeService,
        FormBuilder,
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    facade = TestBed.inject(ReviewPreliminaryDraftFormFacadeService);
  });

  describe('Estado Calculado (Computed)', () => {
    it('isReadOnly debería ser true si el estado es APROBADO', () => {
      facade.draft.set({ state: stateList.APROBADO } as PreliminaryDraft);
      expect(facade.isReadOnly()).toBeTruthy();
    });

    it('isReadOnly debería ser false si el estado no es APROBADO', () => {
      facade.draft.set(mockDraft);
      expect(facade.isReadOnly()).toBeFalsy();
    });

    it('currentDocument debería retornar el documento más reciente', () => {
      facade.draft.set(mockDraft);
      const current = facade.currentDocument();
      expect(current?.name).toBe('Doc V2');
    });
  });

  describe('Resolución de Nombres (UserService)', () => {
    beforeEach(() => {
      facade.draft.set(mockDraft);
    });

    it('debería obtener los nombres de los estudiantes', () => {
      expect(facade.getStudentNames()).toBe('Estudiante 1, Estudiante 2');
      expect(mockUserService.getAuthorsNames).toHaveBeenCalledWith(['user-1', 'user-2']);
    });

    it('debería obtener los nombres de los directores y asesores', () => {
      expect(facade.getDirectorName()).toBe('Nombre de dir-1');
      expect(facade.getCodirectorName()).toBe('Nombre de codir-1');
      expect(facade.getAdvisorName()).toBe('Nombre de adv-1');
    });
  });

  describe('Manejo de Archivos y Validaciones', () => {
    const mockFile = new File([''], 'test.pdf');
    const mockEvent = { fileName: 'test.pdf', file: mockFile };

    it('debería setear el archivo firmado y cerrar el modal', () => {
      facade.isUploadModalOpen.set(true);
      facade.handleFileUploaded(mockEvent);

      expect(facade.uploadedSignedFile()).toEqual(mockEvent);
      expect(facade.isUploadModalOpen()).toBeFalsy();
    });

    it('debería setear el archivo con anotaciones, cerrar el modal y mostrar notificación', () => {
      facade.handleAnnotatedFileUploaded(mockEvent);

      expect(facade.uploadedAnnotatedFile()).toEqual(mockEvent);
      expect(facade.isAnnotatedUploadModalOpen()).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO })
      );
    });

    it('debería retornar null y mostrar error si el formulario es inválido al validar', () => {
      // Formulario vacío por defecto (inválido)
      facade.uploadedSignedFile.set(mockEvent);
      const payload = facade.validateAndGetPayload();

      expect(payload).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          message: 'Por favor, complete el veredicto y las observaciones.'
        })
      );
    });

    it('debería retornar null y mostrar error si falta el archivo principal', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Todo bien' });
      // No seteamos archivo
      const payload = facade.validateAndGetPayload();

      expect(payload).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          message: 'Debe adjuntar el Formato B firmado para guardar la evaluación.'
        })
      );
    });

    it('debería retornar el payload si todo es válido', () => {
      facade.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Excelente' });
      facade.uploadedSignedFile.set(mockEvent);

      const payload = facade.validateAndGetPayload();

      expect(payload).toBeTruthy();
      expect(payload?.formValues.result).toBe('Aprobado');
      expect(payload?.file).toEqual(mockFile);
    });
  });
});
