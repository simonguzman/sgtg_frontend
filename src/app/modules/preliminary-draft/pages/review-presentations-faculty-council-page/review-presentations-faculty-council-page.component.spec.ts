// 1. Angular Core & Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations'; // Previene error NG05105 de hijos

// 2. Core Enums & Interfaces
import { stateList } from '../../../../core/enums/state.enum';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';

// 3. Shared Modules Enums & Interfaces
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { User } from '.././../../users/interfaces/user.interface';
import { Modality } from '../../../proposal/enums/modality.enum';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';

// 4. Component, Service & Models
import { SaveEvaluationPayload } from '../../components/review-presentations-faculty-council-form/models/council-evaluation.model';
import { ReviewPresentationsFacultyCouncilPageComponent } from './review-presentations-faculty-council-page.component';
import { ReviewPresentationsFacultyCouncilPageFacadeService } from './services/review-presentations-faculty-council-page-facade.service';

// Interfaz para el mock del facade (sin usar 'any')
interface MockPageFacadeService {
  filteredPreliminaryDraft: WritableSignal<PreliminaryDraft | null>;
  isConfirmModalOpen: WritableSignal<boolean>;
  loadData: jest.Mock<void, []>;
  goBack: jest.Mock<void, []>;
  handleRequestConfirmation: jest.Mock<void, [SaveEvaluationPayload]>;
  processCouncilDecision: jest.Mock<void, []>;
  downloadFile: jest.Mock<void, [FormattedDocument]>;
}

// 🔹 REFACTOR: Fábricas para generar datos limpios por cada test, evitando mutaciones cruzadas
const createMockUser = (): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Carlos',
  lastName: 'Pérez',
  secondLastName: 'Gómez',
  codeNumber: 20261001,
  roles: [],
  email: 'carlos@universidad.edu.co',
  password: 'hash',
  state: UserState.active
});

const createMockDraft = (): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.EN_REVISION,
  createdData: new Date(),
  evaluations: [],
  documents: [],
  proposalData: {
    id: 'prop-1',
    title: 'Sistema de Gestión',
    description: 'Desc',
    modality: Modality.TI,
    authors: [createMockUser()],
    director: createMockUser(),
    state: stateList.EN_REVISION,
    createdAt: new Date(),
    documents: [],
    evaluations: []
  }
});

const createMockPayload = (): SaveEvaluationPayload => ({
  formValues: {
    result: stateList.APROBADO,
    comments: 'Excelente',
    maximumDeliveryDate: null,
    document: null
  },
  file: new File([''], 'resolucion.pdf', { type: 'application/pdf' })
});

const createMockDocument = (): FormattedDocument => ({
  name: 'documento.pdf',
  url: 'http://docs/documento.pdf'
});

describe('ReviewPresentationsFacultyCouncilPageComponent', () => {
  let component: ReviewPresentationsFacultyCouncilPageComponent;
  let fixture: ComponentFixture<ReviewPresentationsFacultyCouncilPageComponent>;
  let mockFacade: MockPageFacadeService;

  beforeEach(async () => {
    // 🔕 Silenciar los console.error y console.warn para mantener limpia la consola de pruebas
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFacade = {
      filteredPreliminaryDraft: signal<PreliminaryDraft | null>(createMockDraft()),
      isConfirmModalOpen: signal<boolean>(false),
      loadData: jest.fn(),
      goBack: jest.fn(),
      handleRequestConfirmation: jest.fn(),
      processCouncilDecision: jest.fn(),
      downloadFile: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPresentationsFacultyCouncilPageComponent],
      providers: [
        provideNoopAnimations() // Evita errores de animaciones de componentes hijos (Material/PrimeNG)
      ]
    })
    .overrideComponent(ReviewPresentationsFacultyCouncilPageComponent, {
      set: {
        providers: [
          { provide: ReviewPresentationsFacultyCouncilPageFacadeService, useValue: mockFacade }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPresentationsFacultyCouncilPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y navegación', () => {
    it('debería crearse correctamente y ejecutar loadData en ngOnInit', () => {
      fixture.detectChanges();

      expect(component).toBeTruthy();
      expect(mockFacade.loadData).toHaveBeenCalledTimes(1);
    });

    it('debería invocar goBack del facade al hacer clic en el botón de regresar', () => {
      fixture.detectChanges();

      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.nativeElement.click();

      expect(mockFacade.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interacciones con Componentes Hijos desde la Vista (Template Bindings)', () => {
    beforeEach(() => {
      // Configuramos el draft para que se renderice el @if de la vista
      mockFacade.filteredPreliminaryDraft.set(createMockDraft());
      fixture.detectChanges();
    });

    it('debería delegar el evento onSaveEvaluation del formulario al facade', () => {
      const formComponentDE = fixture.debugElement.query(By.css('app-review-presentations-faculty-council-form'));

      const payload = createMockPayload();
      // Simulamos que el componente hijo emite el evento desde el HTML
      formComponentDE.triggerEventHandler('onSaveEvaluation', payload);

      expect(mockFacade.handleRequestConfirmation).toHaveBeenCalledWith(payload);
    });

    it('debería delegar el evento onDownloadFile del formulario al facade', () => {
      const formComponentDE = fixture.debugElement.query(By.css('app-review-presentations-faculty-council-form'));

      const document = createMockDocument();
      formComponentDE.triggerEventHandler('onDownloadFile', document);

      expect(mockFacade.downloadFile).toHaveBeenCalledWith(document);
    });

    it('debería delegar la confirmación del modal al processCouncilDecision', () => {
      const modalDE = fixture.debugElement.query(By.css('app-confirmation-action-modal'));

      modalDE.triggerEventHandler('confirm', undefined);

      expect(mockFacade.processCouncilDecision).toHaveBeenCalledTimes(1);
    });

    it('debería cambiar el estado del modal a falso al emitir onClose desde el modal', () => {
      mockFacade.isConfirmModalOpen.set(true);
      fixture.detectChanges();

      const modalDE = fixture.debugElement.query(By.css('app-confirmation-action-modal'));
      modalDE.triggerEventHandler('onClose', undefined);

      expect(mockFacade.isConfirmModalOpen()).toBeFalsy();
    });
  });
});
