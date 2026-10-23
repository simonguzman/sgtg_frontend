import { TestBed } from '@angular/core/testing';
import { ReviewPazYSalvoFormService } from './review-paz-y-salvo-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { crearTrabajoEnSustentacion } from '../../../../../testing/trabajo-grado-de-prueba';

describe('ReviewPazYSalvoFormService', () => {
  let service: ReviewPazYSalvoFormService;
  let notification: { show: jest.Mock };
  let participants: {
    getStudentNames: jest.Mock; getDirectorName: jest.Mock; getCodirectorName: jest.Mock; getAdvisorName: jest.Mock;
  };
  let resolver: { resolveLatestFinalDeliveryDocument: jest.Mock };
  const trabajo = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [] }));

  beforeEach(() => {
    notification = { show: jest.fn() };
    participants = {
      getStudentNames: jest.fn(() => 'Ana Estudiante'),
      getDirectorName: jest.fn(() => 'Diana Directora'),
      getCodirectorName: jest.fn(() => ''),
      getAdvisorName: jest.fn(() => '')
    };
    resolver = { resolveLatestFinalDeliveryDocument: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        ReviewPazYSalvoFormService,
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: participants },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: resolver }
      ]
    });
    service = TestBed.inject(ReviewPazYSalvoFormService);
  });

  it('delega los nombres de los participantes', () => {
    expect(service.getStudentNames(trabajo)).toBe('Ana Estudiante');
    expect(service.getDirectorName(trabajo)).toBe('Diana Directora');
    service.getCodirectorName(trabajo);
    service.getAdvisorName(trabajo);
    expect(participants.getCodirectorName).toHaveBeenCalledWith(trabajo);
    expect(participants.getAdvisorName).toHaveBeenCalledWith(trabajo);
  });

  it('obtiene los documentos de la solicitud de sustentación', () => {
    const monografia: FileDocument = { id: 'm', name: 'Monografía', url: '/m', uploadDate: '2026-07-01',
      type: DocumentType.MONOGRAFIA };
    resolver.resolveLatestFinalDeliveryDocument.mockReturnValue(monografia);

    expect(service.getExistingDocument(trabajo, 'MONOGRAFIA')).toBe(monografia);
    expect(resolver.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(trabajo, 'MONOGRAFIA');
  });

  it.each([
    ['notifyMissingDecision', 'Falta la decisión'],
    ['notifyMissingObservations', 'Observaciones requeridas'],
    ['notifyMissingDocument', 'Documento faltante']
  ] as const)('%s avisa el error', (metodo, titulo) => {
    service[metodo]();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: titulo, type: NotificationType.ERROR }));
  });

  it('avisa el archivo adjunto con su nombre', () => {
    service.notifyFileAttached('formato-f.pdf');
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Archivo adjunto', message: expect.stringContaining('formato-f.pdf'), type: NotificationType.INFO
    }));
  });
});
