import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EvaluateCorrectionsFormComponent } from './evaluate-corrections-form.component';
import { EvaluateCorrectionsFormService } from './services/evaluate-corrections-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

// --- Mocks de componentes Hijos (UI) ---
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// --- Tipo Utilitario Estricto ---
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

// Mock Components Tipados Correctamente
@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockFileUploadModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label?: string;
  @Input() variant?: string;
  @Input() disabled?: boolean;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '<ng-content></ng-content>', standalone: true })
class MockInfoBannerComponent {
  @Input() title?: string;
}

describe('EvaluateCorrectionsFormComponent', () => {
  let component: EvaluateCorrectionsFormComponent;
  let fixture: ComponentFixture<EvaluateCorrectionsFormComponent>;
  let formServiceMock: jest.Mocked<EvaluateCorrectionsFormService>;

  beforeEach(async () => {
    formServiceMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn(),
      isObservationsValid: jest.fn(),
      buildEvaluationPayload: jest.fn(),
      // Mantenemos mockResolvedValue porque en el servicio real es async
      downloadDocument: jest.fn().mockResolvedValue(undefined),
      notifyFileAttached: jest.fn(),
      notifyMissingVerdict: jest.fn(),
      notifyInvalidObservations: jest.fn(),
      notifyMissingFormatG: jest.fn(),
    } as DeepPartial<EvaluateCorrectionsFormService> as jest.Mocked<EvaluateCorrectionsFormService>;

    await TestBed.configureTestingModule({
      imports: [EvaluateCorrectionsFormComponent]
    })
    .overrideComponent(EvaluateCorrectionsFormComponent, {
      remove: {
        imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent]
      },
      add: {
        imports: [MockFileUploadModalComponent, MockButtonComponent, MockInfoBannerComponent]
      }
    })
    .overrideProvider(EvaluateCorrectionsFormService, { useValue: formServiceMock })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateCorrectionsFormComponent);
    component = fixture.componentInstance;

    // Inyectar datos iniciales tipados con DeepPartial
    component.thesisWork = {
      preliminaryDraftData: { proposalData: { title: 'Tesis de Prueba' } },
      correctedDeliveries: [{ id: 'del-1', monograph: { id: 'doc-1', name: 'Doc' } }]
    } as DeepPartial<ThesisWork> as ThesisWork;

    fixture.detectChanges();
  });

  // Limpieza vital de Mocks
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Signals', () => {
    it('debería calcular la lista de entregas corregidas correctamente', () => {
      expect(component.correctedDeliveriesList()).toHaveLength(1);
      expect(component.correctedDeliveriesList()[0].id).toBe('del-1');
    });

    it('debería actualizar las observaciones en onObservationsChange', () => {
      // Mock de Evento y target tipado a HTMLTextAreaElement
      const mockTarget = { value: 'Nuevas observaciones' } as HTMLTextAreaElement;
      const mockEvent = { target: mockTarget } as DeepPartial<Event> as Event;

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
      const mockDoc = { id: 'doc-1', name: 'Documento' } as DeepPartial<FileDocument> as FileDocument;
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
      const mockPayload = { documentId: 'doc-1', veredict: stateList.APROBADO } as DeepPartial<Omit<Evaluation, 'id' | 'date'>> as Omit<Evaluation, 'id' | 'date'>;

      component.selectedVerdict.set(stateList.APROBADO);
      component.observations.set('Observaciones válidas y detalladas');
      component.uploadedFormatG.set({ fileName: 'acta.pdf', file: mockFile });

      formServiceMock.isObservationsValid.mockReturnValue(true);
      formServiceMock.buildEvaluationPayload.mockReturnValue(mockPayload);

      component.submit();

      expect(formServiceMock.buildEvaluationPayload).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith({ evaluation: mockPayload, file: mockFile });
    });
  });
});
