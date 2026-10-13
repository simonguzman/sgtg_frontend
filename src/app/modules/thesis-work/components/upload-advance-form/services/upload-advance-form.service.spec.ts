import { TestBed } from '@angular/core/testing';
import { MAX_ADVANCE_COMMENTS, UploadAdvanceFormService } from './upload-advance-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

describe('UploadAdvanceFormService', () => {
  let service: UploadAdvanceFormService;
  let notification: { show: jest.Mock };
  let participants: Record<string, jest.Mock>;

  beforeEach(() => {
    notification = { show: jest.fn() };
    participants = {
      getStudentNames: jest.fn().mockReturnValue('Eva Estudiante'),
      getDirectorName: jest.fn().mockReturnValue('Dora Directora'),
      getCodirectorName: jest.fn().mockReturnValue(''),
      getAdvisorName: jest.fn().mockReturnValue('')
    };
    TestBed.configureTestingModule({
      providers: [
        UploadAdvanceFormService,
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: participants }
      ]
    });
    service = TestBed.inject(UploadAdvanceFormService);
  });

  it('las observaciones son opcionales', () => {
    expect(service.advanceForm.valid).toBe(true);
  });

  it(`las observaciones no superan ${MAX_ADVANCE_COMMENTS} caracteres`, () => {
    service.advanceForm.controls.comments.setValue('x'.repeat(MAX_ADVANCE_COMMENTS + 1));
    expect(service.advanceForm.invalid).toBe(true);
  });

  it('delega los nombres de los participantes', () => {
    const thesis = thesisWorkDePrueba();
    expect(service.getStudentNames(thesis)).toBe('Eva Estudiante');
    expect(service.getDirectorName(thesis)).toBe('Dora Directora');
    expect(participants['getStudentNames']).toHaveBeenCalledWith(thesis);
  });

  it('avisa cuando falta el informe', () => {
    service.notifyMissingFiles();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Archivo requerido', type: NotificationType.ERROR
    }));
  });

  it('avisa cuando el formulario es inválido', () => {
    service.notifyIncompleteForm();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Formulario incompleto' }));
  });
});
