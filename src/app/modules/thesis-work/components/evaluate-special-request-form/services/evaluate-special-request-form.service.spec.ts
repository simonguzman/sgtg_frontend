import { TestBed } from '@angular/core/testing';
import { EvaluateSpecialRequestFormService } from './evaluate-special-request-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

describe('EvaluateSpecialRequestFormService', () => {
  let service: EvaluateSpecialRequestFormService;
  let notification: { show: jest.Mock };

  beforeEach(() => {
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        EvaluateSpecialRequestFormService,
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: {
          getStudentNames: () => 'Eva', getDirectorName: () => 'Dora', getCodirectorName: () => 'Carlos',
          getAdvisorName: () => 'Ana'
        } }
      ]
    });
    service = TestBed.inject(EvaluateSpecialRequestFormService);
  });

  it('delega los nombres de los participantes', () => {
    const thesis = thesisWorkDePrueba();
    expect([service.getStudentNames(thesis), service.getDirectorName(thesis), service.getCodirectorName(thesis),
      service.getAdvisorName(thesis)]).toEqual(['Eva', 'Dora', 'Carlos', 'Ana']);
  });

  it('avisa cuando falta la decisión', () => {
    service.notifyMissingVerdict();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Falta la decisión', type: NotificationType.ERROR
    }));
  });

  it('avisa cuando falta la resolución', () => {
    service.notifyMissingResolution();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Resolución requerida', type: NotificationType.ERROR
    }));
  });
});
