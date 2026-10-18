import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ReviewPazYSalvoPageComponent } from './review-paz-y-salvo-page.component';
import { ReviewPazYSalvoFacadeService } from './services/review-paz-y-salvo-facade.service';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnSustentacion } from '../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('ReviewPazYSalvoPageComponent (Decanatura)', () => {
  let fixture: ComponentFixture<ReviewPazYSalvoPageComponent>;
  let page: ReviewPazYSalvoPageComponent;
  let thesisWorkService: { getThesisWorkById: jest.Mock; reviewPazYSalvo: jest.Mock };
  let notification: { show: jest.Mock };
  let router: { navigate: jest.Mock };
  const trabajo = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [],
    rutaPazYSalvo: null, revisionesPazYSalvo: [] }));

  beforeEach(async () => {
    thesisWorkService = { getThesisWorkById: jest.fn(() => of(trabajo)), reviewPazYSalvo: jest.fn(() => of(trabajo)) };
    notification = { show: jest.fn() };
    router = { navigate: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [ReviewPazYSalvoPageComponent],
      providers: [
        ReviewPazYSalvoFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: NotificationService, useValue: notification },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '15' }) }, parent: null } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ReviewPazYSalvoPageComponent);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga el trabajo de la ruta', () => {
    expect(thesisWorkService.getThesisWorkById).toHaveBeenCalledWith('15');
    expect(page.title()).toBe('Sistema de gestión');
  });

  it('exige la decisión y el formato F; si no lo aprueba, también las observaciones', () => {
    page.submit();
    expect(page.missingDecision()).toBe(true);
    expect(page.missingFile()).toBe(true);
    expect(page.isConfirmModalOpen()).toBe(false);

    page.approved.set(false);
    page.formatF.set(pdf('f.pdf'));
    page.submit();
    expect(page.missingObservations()).toBe(true);
    expect(page.isConfirmModalOpen()).toBe(false);

    page.observations.set('Deuda en biblioteca');
    page.submit();
    expect(page.isConfirmModalOpen()).toBe(true);
  });

  it('al confirmar registra la revisión y vuelve a los documentos', () => {
    const archivo = pdf('f.pdf');
    page.approved.set(true);
    page.formatF.set(archivo);
    page.submit();
    page.confirm();

    expect(thesisWorkService.reviewPazYSalvo).toHaveBeenCalledWith('15', true, '', archivo);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Paz y salvo aprobado' }));
    expect(router.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.anything());
  });

  it('muestra el mensaje del backend si rechaza la revisión', () => {
    thesisWorkService.reviewPazYSalvo.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Si el paz y salvo no se aprueba, las observaciones son obligatorias.' }
    })));
    page.approved.set(false);
    page.observations.set('x');
    page.formatF.set(pdf('f.pdf'));
    page.submit();
    page.confirm();

    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      type: NotificationType.ERROR, message: 'Si el paz y salvo no se aprueba, las observaciones son obligatorias.' }));
    expect(page.isSubmitting()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
