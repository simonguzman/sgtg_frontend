import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { EvaluationProposalFormService } from './evaluation-proposal-form.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

import { Proposal } from '../../../interfaces/proposal.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('EvaluationProposalFormService', () => {
  let service: EvaluationProposalFormService;

  let userServiceMock: {
    getAuthorsNames: jest.Mock;
    getUserFullName: jest.Mock;
  };

  let notificationServiceMock: {
    show: jest.Mock;
  };

  beforeEach(() => {
    userServiceMock = {
      getAuthorsNames: jest.fn(),
      getUserFullName: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        EvaluationProposalFormService,
        FormBuilder,
        { provide: UserService, useValue: userServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(EvaluationProposalFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debería inicializar evaluationForm con sus controles requeridos e inválido por defecto', () => {
      const form = service.evaluationForm;

      expect(form).toBeDefined();
      expect(form.get('result')).toBeTruthy();
      expect(form.get('comments')).toBeTruthy();
      expect(form.get('result')?.hasValidator).toBeTruthy();
      expect(form.get('comments')?.hasValidator).toBeTruthy();
      expect(form.valid).toBeFalsy();
    });
  });

  describe('Gestión y Resolución de Documentos', () => {
    describe('resolveOriginalDocument', () => {
      it('debería retornar el primer documento de la lista si existe', () => {
        const mockProposal = {
          documents: [
            { id: 'doc-original-1', name: 'Original.pdf' },
            { id: 'doc-original-2', name: 'Anexo.pdf' }
          ]
        } as Partial<Proposal> as Proposal;

        const result = service.resolveOriginalDocument(mockProposal);

        expect(result).toBeDefined();
        expect(result?.id).toBe('doc-original-1');
      });

      it('debería retornar null si la propuesta no contiene documentos', () => {
        const mockProposal = { documents: [] } as Partial<Proposal> as Proposal;

        const result = service.resolveOriginalDocument(mockProposal);

        expect(result).toBeNull();
      });

      it('debería retornar null si el objeto proposal es nulo o indefinido', () => {
        expect(service.resolveOriginalDocument(null as unknown as Proposal)).toBeNull();
        expect(service.resolveOriginalDocument(undefined as unknown as Proposal)).toBeNull();
      });
    });

    describe('resolveCurrentDocument', () => {
      it('debería retornar null si no existen documentos evaluables del tipo PROPUESTA o CORRECCION', () => {
        const mockProposal = {
          documents: [
            { id: 'doc-1', type: DocumentType.AVANCE },
            { id: 'doc-2', type: 'OTRO_TIPO' as DocumentType }
          ]
        } as Partial<Proposal> as Proposal;

        const result = service.resolveCurrentDocument(mockProposal);

        expect(result).toBeNull();
      });

      it('debería retornar el documento evaluable más reciente según uploadDate', () => {
        const oldDate = new Date('2024-01-01');
        const newestDate = new Date('2024-06-15');
        const middleDate = new Date('2024-03-10');

        const mockProposal = {
          documents: [
            { id: 'doc-viejo', type: DocumentType.PROPUESTA, uploadDate: oldDate },
            { id: 'doc-nuevo', type: DocumentType.CORRECCION, uploadDate: newestDate },
            { id: 'doc-medio', type: DocumentType.CORRECCION, uploadDate: middleDate },
            { id: 'doc-ignorado', type: DocumentType.AVANCE, uploadDate: new Date('2024-12-31') }
          ]
        } as Partial<Proposal> as Proposal;

        const result = service.resolveCurrentDocument(mockProposal);

        expect(result).toBeDefined();
        expect(result?.id).toBe('doc-nuevo');
        expect(result?.type).toBe(DocumentType.CORRECCION);
      });
    });

    describe('formatUploadDate', () => {
      it('debería retornar "Fecha no disponible" si el documento o la fecha son nulos/indefinidos', () => {
        expect(service.formatUploadDate(null)).toBe('Fecha no disponible');
        expect(service.formatUploadDate({} as FileDocument)).toBe('Fecha no disponible');
      });

      it('debería formatear correctamente la fecha si viene como instancia de Date', () => {
        const date = new Date(2024, 4, 15);
        const document = { uploadDate: date } as FileDocument;

        const formatted = service.formatUploadDate(document);

        expect(formatted).toMatch(/15\/5\/2024|15\/05\/2024/);
      });

      it('debería retornar el string directamente si la fecha ya viene en formato de texto', () => {
        const stringDate = '2024-05-15T00:00:00Z';
        const document = { uploadDate: stringDate } as unknown as FileDocument;

        expect(service.formatUploadDate(document)).toBe(stringDate);
      });
    });
  });

  describe('Delegación de Métodos de Usuario', () => {
    it('debería delegar getStudentNames a UserService.getAuthorsNames', () => {
      const mockAuthors = [{ id: 'usr-1', name: 'Estudiante 1' }] as unknown as User[];
      userServiceMock.getAuthorsNames.mockReturnValue('Juan Pérez y María Gómez');

      const result = service.getStudentNames(mockAuthors);

      expect(result).toBe('Juan Pérez y María Gómez');
      expect(userServiceMock.getAuthorsNames).toHaveBeenCalledWith(mockAuthors);
      expect(userServiceMock.getAuthorsNames).toHaveBeenCalledTimes(1);
    });

    it('debería delegar getMemberName a UserService.getUserFullName', () => {
      userServiceMock.getUserFullName.mockReturnValue('Carlos Rodríguez');

      const result = service.getMemberName('usr-123');

      expect(result).toBe('Carlos Rodríguez');
      expect(userServiceMock.getUserFullName).toHaveBeenCalledWith('usr-123');
      expect(userServiceMock.getUserFullName).toHaveBeenCalledTimes(1);
    });
  });

  describe('Notificaciones del Sistema', () => {
    it('debería emitir notificación de tipo CONFIRMATION al adjuntar archivo', () => {
      service.notifyFileUploaded();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Formato A adjuntado',
        message: 'El documento firmado se ha vinculado correctamente a esta evaluación.',
        type: NotificationType.CONFIRMATION
      });
      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
    });

    it('debería emitir notificación de tipo INFO al remover un archivo', () => {
      service.notifyFileRemoved();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Documento removido',
        message: 'Se ha quitado el formato firmado. Recuerde que es obligatorio para finalizar.',
        type: NotificationType.INFO
      });
      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
    });

    it('debería emitir notificación de tipo ERROR cuando el formulario es inválido', () => {
      service.notifyInvalidForm();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Formulario incompleto',
        message: 'Por favor, asegúrese de seleccionar un veredicto y escribir sus observaciones.',
        type: NotificationType.ERROR
      });
      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
    });

    it('debería emitir notificación de tipo ERROR cuando falta el documento requerido', () => {
      service.notifyMissingFile();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Documento requerido',
        message: 'Debe cargar el Formato A firmado para poder registrar la evaluación.',
        type: NotificationType.ERROR
      });
      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
    });
  });
});
