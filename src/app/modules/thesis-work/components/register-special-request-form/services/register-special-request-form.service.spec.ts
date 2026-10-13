import { TestBed } from '@angular/core/testing';
import { RegisterSpecialRequestFormService } from './register-special-request-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

describe('RegisterSpecialRequestFormService', () => {
  let service: RegisterSpecialRequestFormService;
  let notification: { show: jest.Mock };
  let participants: Record<string, jest.Mock>;

  beforeEach(() => {
    notification = { show: jest.fn() };
    participants = {
      getStudentNames: jest.fn().mockReturnValue('Eva'),
      getDirectorName: jest.fn().mockReturnValue('Dora'),
      getCodirectorName: jest.fn().mockReturnValue(''),
      getAdvisorName: jest.fn().mockReturnValue('')
    };
    TestBed.configureTestingModule({
      providers: [
        RegisterSpecialRequestFormService,
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: participants }
      ]
    });
    service = TestBed.inject(RegisterSpecialRequestFormService);
  });

  it('el tipo de solicitud es obligatorio', () => {
    expect(service.form.controls.requestType.hasError('required')).toBe(true);
  });

  it('carga el título y los objetivos vigentes para editarlos', () => {
    service.loadCurrentDescription(thesisWorkDePrueba());
    expect(service.form.controls.title.value).toBe('Sistema de gestión');
    expect(service.objectives.getRawValue()).toEqual(['Objetivo general', 'Objetivo específico']);
  });

  it('agrega objetivos específicos y no permite quitar el general', () => {
    service.loadCurrentDescription(thesisWorkDePrueba());
    service.addObjective('Otro');
    expect(service.objectives.length).toBe(3);
    service.removeObjective(0);
    expect(service.objectives.length).toBe(3);
    service.removeObjective(2);
    expect(service.objectives.getRawValue()).toEqual(['Objetivo general', 'Objetivo específico']);
  });

  it('delega los nombres de los participantes', () => {
    const thesis = thesisWorkDePrueba();
    expect(service.getStudentNames(thesis)).toBe('Eva');
    expect(service.getDirectorName(thesis)).toBe('Dora');
    expect(service.getCodirectorName(thesis)).toBe('');
    expect(service.getAdvisorName(thesis)).toBe('');
  });

  it('avisa cuando el formulario está incompleto (con mensaje por defecto o específico)', () => {
    service.notifyIncompleteForm();
    service.notifyIncompleteForm('Adjunte el documento');
    expect(notification.show).toHaveBeenNthCalledWith(1, expect.objectContaining({
      title: 'Formulario incompleto', type: NotificationType.ERROR
    }));
    expect(notification.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ message: 'Adjunte el documento' }));
  });
});
