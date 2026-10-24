import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { PreliminaryDraftDetailsPageComponent } from './preliminary-draft-details-page.component';
import { PreliminaryDraftDetailsPageService } from './services/preliminary-draft-details-page.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { WorkDetailsComponent } from '../../../../shared/components/work-details/work-details.component';
import { WorkDetailsDocument, WorkDetailsView } from '../../../../shared/components/work-details/work-details.model';

@Component({
  selector: 'app-button-component',
  standalone: true,
  template: '<button (click)="onClick.emit()">{{ label }}</button>'
})
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-work-details', standalone: true, template: '' })
class MockWorkDetailsComponent {
  @Input() view!: WorkDetailsView;
  @Output() download = new EventEmitter<WorkDetailsDocument>();
}

interface MockPageService {
  init: jest.Mock<void, []>;
  goBack: jest.Mock<void, []>;
  navigateToEvaluations: jest.Mock<void, []>;
  navigateToDocuments: jest.Mock<void, []>;
  downloadDocument: jest.Mock<void, [WorkDetailsDocument]>;
  preliminaryDraftDetails: WritableSignal<PreliminaryDraft | null>;
  view: WritableSignal<WorkDetailsView | null>;
}

const vista: WorkDetailsView = {
  heading: 'Información del anteproyecto', title: 'Sistema Inteligente de Gestión', specificObjectives: [],
  modality: 'Trabajo de investigación', state: 'En revisión', participants: [], dates: [], documents: []
};

describe('PreliminaryDraftDetailsPageComponent', () => {
  let component: PreliminaryDraftDetailsPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftDetailsPageComponent>;
  let mockPageService: MockPageService;

  beforeEach(async () => {
    mockPageService = {
      init: jest.fn(),
      goBack: jest.fn(),
      navigateToEvaluations: jest.fn(),
      navigateToDocuments: jest.fn(),
      downloadDocument: jest.fn(),
      preliminaryDraftDetails: signal<PreliminaryDraft | null>(null),
      view: signal<WorkDetailsView | null>(null)
    };

    await TestBed.configureTestingModule({ imports: [PreliminaryDraftDetailsPageComponent] })
      .overrideComponent(PreliminaryDraftDetailsPageComponent, {
        remove: { imports: [ButtonComponent, WorkDetailsComponent] },
        add: {
          imports: [MockButtonComponent, MockWorkDetailsComponent],
          providers: [{ provide: PreliminaryDraftDetailsPageService, useValue: mockPageService }]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftDetailsPageComponent);
    component = fixture.componentInstance;
  });

  const detalle = () => fixture.debugElement.query(By.directive(MockWorkDetailsComponent));

  const conDetalle = () => {
    mockPageService.preliminaryDraftDetails.set({} as PreliminaryDraft);
    mockPageService.view.set(vista);
    fixture.detectChanges();
  };

  describe('Inicialización y renderizado condicional', () => {
    it('debería crearse e inicializar el servicio en ngOnInit', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
      expect(mockPageService.init).toHaveBeenCalledTimes(1);
    });

    it('debería mostrar el mensaje de carga mientras no hay vista', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Cargando información del anteproyecto...');
      expect(detalle()).toBeNull();
    });

    it('debería mostrar el detalle con la vista del servicio', () => {
      conDetalle();
      expect(fixture.nativeElement.textContent).not.toContain('Cargando información del anteproyecto...');
      expect(detalle().componentInstance.view).toBe(vista);
    });
  });

  describe('Interacciones y Eventos de Vista (Bindings)', () => {
    beforeEach(() => conDetalle());

    it('debería ejecutar goBack() al hacer clic en Regresar', () => {
      fixture.debugElement.query(By.css('button.group')).nativeElement.click();
      expect(mockPageService.goBack).toHaveBeenCalledTimes(1);
    });

    it('debería navegar a las evaluaciones y a los documentos', () => {
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      buttons[0].componentInstance.onClick.emit();
      buttons[1].componentInstance.onClick.emit();
      expect(mockPageService.navigateToEvaluations).toHaveBeenCalledTimes(1);
      expect(mockPageService.navigateToDocuments).toHaveBeenCalledTimes(1);
    });

    it('debería delegar la descarga del documento elegido en el detalle', () => {
      const documento = { name: 'Anteproyecto', description: 'Versión vigente', url: '/a' };
      detalle().componentInstance.download.emit(documento);
      expect(mockPageService.downloadDocument).toHaveBeenCalledWith(documento);
    });
  });
});
