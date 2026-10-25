import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EvaluationProposalFormService } from './evaluation-proposal-form.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { Proposal } from '../../../interfaces/proposal.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('EvaluationProposalFormService', () => {
  let service: EvaluationProposalFormService;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let userServiceMock: {
    getAuthorsNames: jest.Mock;
    getUserFullName: jest.Mock;
  };
  let notificationServiceMock: {
    show: jest.Mock;
  };
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
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
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
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
      it('debería retornar la versión que está En revisión, no la primera radicada', () => {
        const mockProposal = {
          documents: [
            { id: 'v1', type: DocumentType.PROPUESTA, version: 1, status: stateList.NO_APROBADO },
            { id: 'v2', type: DocumentType.PROPUESTA, version: 2, status: stateList.EN_REVISION },
            { id: 'carta', type: DocumentType.FORMATO, version: 1 }
          ]
        } as Partial<Proposal> as Proposal;
        const result = service.resolveOriginalDocument(mockProposal);
        expect(result?.id).toBe('v2');
        expect(result?.status).toBe(stateList.EN_REVISION);
      });
      it('sin versión En revisión retorna la última versión radicada', () => {
        const mockProposal = {
          documents: [
            { id: 'v2', type: DocumentType.PROPUESTA, version: 2, status: stateList.APROBADO },
            { id: 'v1', type: DocumentType.PROPUESTA, version: 1, status: stateList.NO_APROBADO }
          ]
        } as Partial<Proposal> as Proposal;
        expect(service.resolveOriginalDocument(mockProposal)?.id).toBe('v2');
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
      it('debería retornar la versión evaluable con el mayor número de versión', () => {
        const mismaFecha = new Date('2024-06-15');
        const mockProposal = {
          documents: [
            { id: 'doc-v1', type: DocumentType.PROPUESTA, version: 1, uploadDate: mismaFecha },
            { id: 'doc-v3', type: DocumentType.PROPUESTA, version: 3, uploadDate: mismaFecha },
            { id: 'doc-v2', type: DocumentType.PROPUESTA, version: 2, uploadDate: mismaFecha },
            { id: 'doc-ignorado', type: DocumentType.AVANCE, version: 9, uploadDate: new Date('2024-12-31') }
          ]
        } as Partial<Proposal> as Proposal;
        const result = service.resolveCurrentDocument(mockProposal);
        expect(result?.id).toBe('doc-v3');
      });
    });
    describe('resolveAcceptanceLetter', () => {
      it('debería retornar la carta de aceptación, o null si no se radicó', () => {
        const carta = { id: 'carta', type: DocumentType.FORMATO } as FileDocument;
        const formatoA = { id: 'doc-v1', type: DocumentType.PROPUESTA, version: 1 } as FileDocument;
        expect(service.resolveAcceptanceLetter({ documents: [formatoA, carta] } as Proposal)).toBe(carta);
        expect(service.resolveAcceptanceLetter({ documents: [formatoA] } as Proposal)).toBeNull();
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
        title: 'Documento de respuesta adjuntado',
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
        message: 'Debe cargar el documento de respuesta del Comité para poder registrar la evaluación.',
        type: NotificationType.ERROR
      });
      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
    });
  });
});
