import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { fechaHoraLocal, RegisterSustentationFacadeService } from './register-sustentation-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('RegisterSustentationFacadeService', () => {
  let facade: RegisterSustentationFacadeService;
  let thesisWorkService: { getThesisWorkByIdMock: jest.Mock; scheduleSustentation: jest.Mock };
  let download: { download: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    thesisWorkService = { getThesisWorkByIdMock: jest.fn(), scheduleSustentation: jest.fn() };
    download = { download: jest.fn().mockResolvedValue(undefined) };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: FileDownloadService, useValue: download },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(RegisterSustentationFacadeService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('fechaHoraLocal da la fecha y hora local que espera el backend', () => {
    expect(fechaHoraLocal(new Date(2026, 6, 15, 9, 5))).toBe('2026-07-15T09:05:00');
  });

  it('carga el trabajo o avisa si no existe', () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(thesisWorkDePrueba()));
    facade.loadThesisWork('15', onSuccess, onError);
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(undefined));
    facade.loadThesisWork('99', onSuccess, onError);
    expect(onSuccess).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('programa la sesión con el coordinador (primer jurado), el segundo jurado y el formato E', () => {
    const formatoE = pdf('e.pdf');
    thesisWorkService.scheduleSustentation.mockReturnValue(of(thesisWorkDePrueba()));
    const onSuccess = jest.fn();
    facade.processSustentation('15', {
      sustentationDate: new Date(2026, 6, 15, 9, 30), location: 'Sala 1', juror1: '30', juror2: '31'
    }, formatoE, onSuccess, jest.fn());

    expect(thesisWorkService.scheduleSustentation).toHaveBeenCalledWith('15', {
      coordinatorId: '30', jurorId: '31', dateTime: '2026-07-15T09:30:00', location: 'Sala 1', formatE: formatoE
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sustentación programada' }));
  });

  it('muestra el mensaje del backend si la rechaza', () => {
    thesisWorkService.scheduleSustentation.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Un jurado no puede ser evaluador del anteproyecto del mismo trabajo.' }
    })));
    const onError = jest.fn();
    facade.processSustentation('15', { sustentationDate: new Date(), location: 'S', juror1: '20', juror2: '31' },
      pdf('e.pdf'), jest.fn(), onError);
    expect(onError).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Un jurado no puede ser evaluador del anteproyecto del mismo trabajo.', type: NotificationType.ERROR
    }));
  });

  it('descarga los documentos del trabajo', async () => {
    await facade.downloadDocument({ id: 'a', name: 'formato-e', url: '/x', uploadDate: '' } as never);
    expect(download.download).toHaveBeenCalledWith('/x', 'formato-e.pdf');
    await facade.downloadDocument({ id: 'a', name: 'x', url: '', uploadDate: '' } as never);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de descarga' }));
  });
});
