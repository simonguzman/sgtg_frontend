// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';

// 2. Componente a probar
import { EvaluateCorrectionsFormComponent } from './evaluate-corrections-form.component';
import { EvaluateCorrectionsFormService } from './services/evaluate-corrections-form.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../interfaces/corrected-delivery.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { SustentationRegistry } from '../../interfaces/sustentation-registry.interface';

// 4. Componentes Reales para Override
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// ── Mocks de Componentes Hijos (Standalone y Strict-Init) ────────────────────

@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockFileUploadModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '<ng-content></ng-content>', standalone: true })
class MockInfoBannerComponent {
  @Input() title = '';
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ─────────

interface MockEvaluateCorrectionsFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getAssignedJurors: jest.Mock<string, [ThesisWork]>;
  isObservationsValid: jest.Mock<boolean, [string]>;
  buildEvaluationPayload: jest.Mock<Omit<Evaluation, 'id' | 'date'>, [ThesisWork, stateList, string, CorrectedDelivery[]]>;
  downloadDocument: jest.Mock<Promise<void>, [FileDocument]>;
  notifyFileAttached: jest.Mock<void, []>;
  notifyMissingVerdict: jest.Mock<void, []>;
  notifyInvalidObservations: jest.Mock<void, []>;
  notifyMissingFormatG: jest.Mock<void, []>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'archivo',
  url: 'http://test.com/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

const createMockSustentationRegistry = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sust-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  assignedJurors: [createMockUser({ id: 'j-1', firstName: 'Jurado', lastName: 'Uno' })],
  verdicts: [],
  ...overrides
});

const createMockCorrectedDelivery = (overrides: Partial<CorrectedDelivery> = {}): CorrectedDelivery => ({
  id: 'del-1',
  uploadDate: new Date(),
  monograph: createMockFileDocument({ id: 'doc-mono', name: 'Monografia Corregida' }),
  annexes: createMockFileDocument({ id: 'doc-anexos', name: 'Anexos Corregidos' }),
  status: stateList.APROBADO,
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    sustentations: [createMockSustentationRegistry()],
    correctedDeliveries: [createMockCorrectedDelivery()],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
        title: 'Tesis de Prueba',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    }
  };
  return { ...baseThesis, ...overrides };
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateCorrectionsFormComponent', () => {
  let component: EvaluateCorrectionsFormComponent;
  let fixture: ComponentFixture<EvaluateCorrectionsFormComponent>;

  // Interface mock estricta
  let formServiceMock: MockEvaluateCorrectionsFormService;

  // Fábrica de datos seguros
  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    // 🔕 Silenciar consola preventivamente
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente sin "as any"
    formServiceMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn(),
      isObservationsValid: jest.fn(),
      buildEvaluationPayload: jest.fn(),
      downloadDocument: jest.fn().mockResolvedValue(undefined),
      notifyFileAttached: jest.fn(),
      notifyMissingVerdict: jest.fn(),
      notifyInvalidObservations: jest.fn(),
      notifyMissingFormatG: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateCorrectionsFormComponent]
    })
    .overrideComponent(EvaluateCorrectionsFormComponent, {
      remove: {
        imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
        providers: [EvaluateCorrectionsFormService]
      },
      add: {
        imports: [MockFileUploadModalComponent, MockButtonComponent, MockInfoBannerComponent],
        providers: [{ provide: EvaluateCorrectionsFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateCorrectionsFormComponent);
    component = fixture.componentInstance;

    // Inyección de input segura
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Prevenir contaminación entre tests
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Signals', () => {
    it('debería calcular la lista de entregas corregidas correctamente', () => {
      expect(component.correctedDeliveriesList()).toHaveLength(1);
      expect(component.correctedDeliveriesList()[0].id).toBe('del-1');
    });

    it('debería actualizar las observaciones en onObservationsChange de forma segura', () => {
      // Mock de Evento y target HTML nativo (Sin 'as any')
      const textarea = document.createElement('textarea');
      textarea.value = 'Nuevas observaciones';
      const mockEvent = new Event('input');

      // Asignación de target en JS nativo seguro para tests
      Object.defineProperty(mockEvent, 'target', { writable: false, value: textarea });

      component.onObservationsChange(mockEvent);
      expect(component.observations()).toBe('Nuevas observaciones');
    });

    it('debería manejar la carga del Formato_G', () => {
      const mockFile = { fileName: 'acta.pdf', file: new File([''], 'acta.pdf') };
      component.handleFormatGUploaded(mockFile);

      expect(component.uploadedFormatG()).toEqual(mockFile);
      expect(component.isModalOpen()).toBe(false);
      expect(formServiceMock.notifyFileAttached).toHaveBeenCalled();
    });

    it('debería descargar un documento a través del servicio', () => {
      const mockDoc = createMockFileDocument({ id: 'doc-1', name: 'Documento' });

      component.downloadDocument(mockDoc);

      expect(formServiceMock.downloadDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('Flujo de envío (Submit)', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.onSubmitEvaluation, 'emit');
    });

    it('debería bloquear el envío y notificar si falta el veredicto', () => {
      component.selectedVerdict.set(null);
      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingVerdict).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería bloquear el envío y notificar si las observaciones son inválidas', () => {
      component.selectedVerdict.set(stateList.APROBADO);
      component.observations.set('Corto');
      formServiceMock.isObservationsValid.mockReturnValue(false);

      component.submit();

      expect(formServiceMock.notifyInvalidObservations).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería bloquear el envío y notificar si falta el Formato_G', () => {
      component.selectedVerdict.set(stateList.APROBADO);
      component.observations.set('Observaciones válidas y detalladas');
      formServiceMock.isObservationsValid.mockReturnValue(true);
      component.uploadedFormatG.set(null);

      component.submit();

      expect(formServiceMock.notifyMissingFormatG).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería emitir el evento de evaluación si todo es válido', () => {
      const mockFile = new File([''], 'acta.pdf');

      const mockPayload: Omit<Evaluation, 'id' | 'date'> = {
        documentId: 'doc-1',
        proposalId: 'prop-1',
        evaluatorId: 'u-1',
        evaluatorName: 'Jurado',
        evaluatorRole: 'JURADO',
        veredict: stateList.APROBADO,
        observations: 'Observaciones válidas y detalladas'
      };

      component.selectedVerdict.set(stateList.APROBADO);
      component.observations.set('Observaciones válidas y detalladas');
      component.uploadedFormatG.set({ fileName: 'acta.pdf', file: mockFile });

      formServiceMock.isObservationsValid.mockReturnValue(true);
      formServiceMock.buildEvaluationPayload.mockReturnValue(mockPayload);

      component.submit();

      expect(formServiceMock.buildEvaluationPayload).toHaveBeenCalledWith(
        mockThesisWork,
        stateList.APROBADO,
        'Observaciones válidas y detalladas',
        mockThesisWork.correctedDeliveries
      );
      expect(emitSpy).toHaveBeenCalledWith({ evaluation: mockPayload, file: mockFile });
    });
  });
});
