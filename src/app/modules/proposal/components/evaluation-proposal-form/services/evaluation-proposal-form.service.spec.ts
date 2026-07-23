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

  let mockUserService: jest.Mocked<UserService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Inicialización estricta de mocks
    mockUserService = {
      getAuthorsNames: jest.fn(),
      getUserFullName: jest.fn()
    } as unknown as jest.Mocked<UserService>;

    mockNotificationService = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        EvaluationProposalFormService,
        FormBuilder, // Angular provee este nativamente al importar ReactiveFormsModule
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    service = TestBed.inject(EvaluationProposalFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería inicializar evaluationForm con controles requeridos', () => {
      const form = service.evaluationForm;
      expect(form).toBeDefined();
      expect(form.get('result')?.hasValidator).toBeTruthy();
      expect(form.get('comments')?.hasValidator).toBeTruthy();
      expect(form.valid).toBe(false); // Inicia inválido porque está vacío
    });
  });

  describe('Gestión de Documentos', () => {
    describe('resolveOriginalDocument', () => {
      it('debería retornar el primer documento si existe', () => {
        const mockProposal = {
          documents: [{ id: 'doc-1' }, { id: 'doc-2' }]
        } as unknown as Proposal;

        const result = service.resolveOriginalDocument(mockProposal);
        expect(result?.id).toBe('doc-1');
      });

      it('debería retornar null si la propuesta no tiene documentos o es nula', () => {
        expect(service.resolveOriginalDocument({ documents: [] } as unknown as Proposal)).toBeNull();
        expect(service.resolveOriginalDocument(undefined as unknown as Proposal)).toBeNull();
      });
    });

    describe('resolveCurrentDocument', () => {
      it('debería retornar null si no hay documentos evaluables (Propuesta o Corrección)', () => {
        const mockProposal = {
          documents: [
            { type: DocumentType.AVANCE },
            { type: 'OTRO_TIPO' } // Simulando un tipo inválido
          ]
        } as unknown as Proposal;

        expect(service.resolveCurrentDocument(mockProposal)).toBeNull();
      });

      it('debería retornar el documento evaluable más reciente', () => {
        // Ordenamos las fechas intencionalmente desordenadas para probar el sort
        const oldDate = new Date('2023-01-01');
        const newestDate = new Date('2023-12-31');
        const middleDate = new Date('2023-06-15');

        const mockProposal = {
          documents: [
            { id: 'doc-viejo', type: DocumentType.PROPUESTA, uploadDate: oldDate },
            { id: 'doc-nuevo', type: DocumentType.CORRECCION, uploadDate: newestDate },
            { id: 'doc-medio', type: DocumentType.CORRECCION, uploadDate: middleDate },
            { id: 'doc-ignorado', type: DocumentType.AVANCE, uploadDate: new Date('2024-01-01') } // Más nuevo pero tipo inválido
          ]
        } as unknown as Proposal;

        const result = service.resolveCurrentDocument(mockProposal);

        expect(result).toBeDefined();
        expect(result?.id).toBe('doc-nuevo');
        expect(result?.type).toBe(DocumentType.CORRECCION);
      });
    });

    describe('formatUploadDate', () => {
      it('debería retornar "Fecha no disponible" si no hay documento o fecha', () => {
        expect(service.formatUploadDate(null)).toBe('Fecha no disponible');
        expect(service.formatUploadDate({} as FileDocument)).toBe('Fecha no disponible');
      });

      it('debería formatear la fecha correctamente si es un objeto Date', () => {
        // Usamos una fecha fija para evitar problemas con la zona horaria en el test
        const date = new Date(2024, 4, 15); // Mes 4 es Mayo (0-indexado)
        const document = { uploadDate: date } as FileDocument;

        // Dependiendo de la configuración local, toLocaleDateString('es-ES') puede devolver variaciones,
        // pero verificamos que se llamó la conversión.
        const formatted = service.formatUploadDate(document);
        expect(formatted).toMatch(/15\/5\/2024|15\/05\/2024/);
      });

      it('debería retornar el string de la fecha si ya viene como string', () => {
        const stringDate = '2024-05-15T00:00:00Z';
        const document = { uploadDate: stringDate } as unknown as FileDocument;

        expect(service.formatUploadDate(document)).toBe(stringDate);
      });
    });
  });

  describe('Delegación de Formateo de Nombres', () => {
    it('debería delegar getStudentNames al userService', () => {
      const mockAuthors = [{ id: 'user-1' }] as User[];
      mockUserService.getAuthorsNames.mockReturnValue('Juan Perez');

      const result = service.getStudentNames(mockAuthors);

      expect(result).toBe('Juan Perez');
      expect(mockUserService.getAuthorsNames).toHaveBeenCalledWith(mockAuthors);
    });

    it('debería delegar getMemberName al userService', () => {
      mockUserService.getUserFullName.mockReturnValue('Dra. Maria Gomez');

      const result = service.getMemberName('doc-1');

      expect(result).toBe('Dra. Maria Gomez');
      expect(mockUserService.getUserFullName).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('Notificaciones', () => {
    it('debería notificar notifyFileUploaded correctamente', () => {
      service.notifyFileUploaded();
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Formato A adjuntado',
        message: 'El documento firmado se ha vinculado correctamente a esta evaluación.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debería notificar notifyFileRemoved correctamente', () => {
      service.notifyFileRemoved();
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Documento removido',
        message: 'Se ha quitado el formato firmado. Recuerde que es obligatorio para finalizar.',
        type: NotificationType.INFO
      });
    });

    it('debería notificar notifyInvalidForm correctamente', () => {
      service.notifyInvalidForm();
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Formulario incompleto',
        message: 'Por favor, asegúrese de seleccionar un veredicto y escribir sus observaciones.',
        type: NotificationType.ERROR
      });
    });

    it('debería notificar notifyMissingFile correctamente', () => {
      service.notifyMissingFile();
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Documento requerido',
        message: 'Debe cargar el Formato A firmado para poder registrar la evaluación.',
        type: NotificationType.ERROR
      });
    });
  });
});
