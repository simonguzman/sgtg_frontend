import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ReviewPazYSalvoPageComponent } from './review-paz-y-salvo-page.component';
import { ReviewPazYSalvoFacadeService } from './services/review-paz-y-salvo-facade.service';
import { ReviewPazYSalvoFormComponent } from '../../components/review-paz-y-salvo-form/review-paz-y-salvo-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoReviewPayload } from '../../interfaces/paz-y-salvo-review.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnSustentacion } from '../../../../testing/trabajo-grado-de-prueba';

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-review-paz-y-salvo-form', template: '', standalone: true })
class MockReviewPazYSalvoFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ payload: PazYSalvoReviewPayload; file: File }>();
  @Output() onGoBack = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();
}

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('ReviewPazYSalvoPageComponent (Decanatura)', () => {
  let fixture: ComponentFixture<ReviewPazYSalvoPageComponent>;
  let page: ReviewPazYSalvoPageComponent;
  let facade: {
    loadThesisWork: jest.Mock; processPazYSalvo: jest.Mock; downloadDocument: jest.Mock; showNavigationError: jest.Mock;
  };
  let router: { navigate: jest.Mock };
  let routeId: string | null;
  const trabajo = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [],
    rutaPazYSalvo: null, revisionesPazYSalvo: [] }));

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewPazYSalvoPageComponent],
      providers: [
        { provide: ReviewPazYSalvoFacadeService, useValue: facade },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) },
          parent: null } }
      ]
    })
      .overrideComponent(ReviewPazYSalvoPageComponent, {
        remove: { imports: [ReviewPazYSalvoFormComponent, ConfirmationActionModalComponent] },
        add: { imports: [MockReviewPazYSalvoFormComponent, MockConfirmationActionModalComponent] }
      })
      .compileComponents();
    fixture = TestBed.createComponent(ReviewPazYSalvoPageComponent);
    page = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    facade = {
      loadThesisWork: jest.fn((_id: string, onSuccess: (work: ThesisWork) => void) => onSuccess(trabajo)),
      processPazYSalvo: jest.fn(),
      downloadDocument: jest.fn().mockResolvedValue(undefined),
      showNavigationError: jest.fn()
    };
    router = { navigate: jest.fn() };
    routeId = '15';
  });

  it('carga el trabajo de la ruta y monta el formulario', async () => {
    await crear();
    expect(facade.loadThesisWork).toHaveBeenCalledWith('15', expect.any(Function), expect.any(Function));
    expect(page.thesisWorkState()).toBe(trabajo);
    expect(fixture.nativeElement.querySelector('app-review-paz-y-salvo-form')).toBeTruthy();
  });

  it('sin id en la ruta avisa y vuelve a los documentos', async () => {
    routeId = null;
    await crear();
    expect(facade.showNavigationError).toHaveBeenCalled();
    expect(facade.loadThesisWork).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.anything());
  });

  it('al guardar el formulario pide confirmación', async () => {
    await crear();
    const datos = { payload: { approved: true, observations: '' }, file: pdf('f.pdf') };
    page.handleRequestConfirmation(datos);
    expect(page.pendingData()).toEqual(datos);
    expect(page.isConfirmModalOpen()).toBe(true);
  });

  it('al confirmar registra la revisión y vuelve a los documentos', async () => {
    facade.processPazYSalvo.mockImplementation((_id, _payload, _file, onSuccess: () => void) => onSuccess());
    await crear();
    const archivo = pdf('f.pdf');
    page.handleRequestConfirmation({ payload: { approved: false, observations: 'Deuda' }, file: archivo });

    page.processPazYSalvo();

    expect(facade.processPazYSalvo).toHaveBeenCalledWith('15', { approved: false, observations: 'Deuda' }, archivo,
      expect.any(Function), expect.any(Function));
    expect(page.isConfirmModalOpen()).toBe(false);
    expect(page.isSubmitting()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.anything());
  });

  it('si el backend la rechaza se queda en la página', async () => {
    facade.processPazYSalvo.mockImplementation((_id, _payload, _file, _ok, onError: () => void) => onError());
    await crear();
    page.handleRequestConfirmation({ payload: { approved: true, observations: '' }, file: pdf('f.pdf') });

    page.processPazYSalvo();

    expect(page.isSubmitting()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('delega las descargas al facade', async () => {
    await crear();
    const documento: FileDocument = { id: 'm', name: 'Monografía', url: '/m', uploadDate: '2026-07-01',
      type: DocumentType.MONOGRAFIA };
    page.downloadDocument(documento);
    expect(facade.downloadDocument).toHaveBeenCalledWith(documento);
  });
});
