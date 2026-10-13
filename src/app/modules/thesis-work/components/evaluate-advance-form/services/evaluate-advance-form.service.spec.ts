import { TestBed } from '@angular/core/testing';
import { EvaluateAdvanceFormService, MAX_REVIEW_COMMENTS } from './evaluate-advance-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

describe('EvaluateAdvanceFormService', () => {
  let service: EvaluateAdvanceFormService;
  let notification: { show: jest.Mock };
  let participants: Record<string, jest.Mock>;

  beforeEach(() => {
    notification = { show: jest.fn() };
    participants = {
      getStudentNames: jest.fn().mockReturnValue('Eva'),
      getDirectorName: jest.fn().mockReturnValue('Dora'),
      getCodirectorName: jest.fn().mockReturnValue('Carlos'),
      getAdvisorName: jest.fn().mockReturnValue('Ana')
    };
    TestBed.configureTestingModule({
      providers: [
        EvaluateAdvanceFormService,
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: participants }
      ]
    });
    service = TestBed.inject(EvaluateAdvanceFormService);
  });

  it('las observaciones son opcionales (puede revisar solo con el PDF)', () => {
    expect(service.evaluationForm.valid).toBe(true);
  });

  it(`las observaciones no superan ${MAX_REVIEW_COMMENTS} caracteres`, () => {
    service.evaluationForm.controls.comments.setValue('x'.repeat(MAX_REVIEW_COMMENTS + 1));
    expect(service.evaluationForm.invalid).toBe(true);
  });

  it('delega los nombres de los participantes', () => {
    const thesis = thesisWorkDePrueba();
    expect([service.getStudentNames(thesis), service.getDirectorName(thesis), service.getCodirectorName(thesis),
      service.getAdvisorName(thesis)]).toEqual(['Eva', 'Dora', 'Carlos', 'Ana']);
  });

  it('avisa cuando la revisión está vacía', () => {
    service.notifyEmptyReview();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Revisión vacía', type: NotificationType.ERROR
    }));
  });
});
