import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadFinalDeliveryFormComponent, UploadedFile } from './upload-final-delivery-form.component';
import { UploadFinalDeliveryFormService } from './services/upload-final-delivery-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { By } from '@angular/platform-browser';
import { Modality } from '../../../proposal/enums/modality.enum';
import { stateList } from '../../../../core/enums/state.enum';

// Utilidad para tipar profundamente mocks sin usar 'any' ni 'unknown'
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe('UploadFinalDeliveryFormComponent', () => {
  let component: UploadFinalDeliveryFormComponent;
  let fixture: ComponentFixture<UploadFinalDeliveryFormComponent>;

  // Tipado estricto usando Partial para evitar 'unknown'
  let formServiceSpy: Partial<jest.Mocked<UploadFinalDeliveryFormService>>;

  // Mock estructurado sin as unknown
  const mockThesisWork: DeepPartial<ThesisWork> = {
    preliminaryDraftData: {
      proposalData: { title: 'Título Test', description: 'Desc Test', modality: Modality.TI }
    },
    state: stateList.EN_DESARROLLO
  };

  beforeEach(async () => {
    formServiceSpy = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante'),
      getDirectorName: jest.fn().mockReturnValue('Director'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor'),
      notifyFileAttached: jest.fn(),
      notifyMissingDocuments: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UploadFinalDeliveryFormComponent]
    })
    .overrideComponent(UploadFinalDeliveryFormComponent, {
      remove: { providers: [UploadFinalDeliveryFormService] },
      add: { providers: [{ provide: UploadFinalDeliveryFormService, useValue: formServiceSpy }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadFinalDeliveryFormComponent);
    component = fixture.componentInstance;

    // Asignación con casteo directo confiando en la estructura Parcial (Seguro y sin unknown)
    component.thesisWork = mockThesisWork as ThesisWork;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Estado Inicial', () => {
    it('debe inicializarse con todos los archivos nulos y ningún modal activo', () => {
      expect(component.uploadedMonograph()).toBeNull();
      expect(component.uploadedFormatE()).toBeNull();
      expect(component.uploadedAnnexes()).toBeNull();
      expect(component.activeModal()).toBeNull();
      expect(component.isSubmitAttempted()).toBe(false);
    });

    it('debe invocar los métodos del servicio para formatear los nombres de los participantes', () => {
      expect(component.getStudentNames()).toBe('Estudiante');
      expect(component.getDirectorName()).toBe('Director');
      expect(component.getCodirectorName()).toBe('Codirector');
      expect(component.getAdvisorName()).toBe('Asesor');

      expect(formServiceSpy.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceSpy.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceSpy.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceSpy.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Control de Modales (openModal / closeModal)', () => {
    it('debe establecer el modal activo al invocar openModal', () => {
      component.openModal('MONOGRAPH');
      expect(component.activeModal()).toBe('MONOGRAPH');
    });

    it('debe resetear el modal activo a null al llamar closeModal', () => {
      component.openModal('FORMAT_E');
      component.closeModal();
      expect(component.activeModal()).toBeNull();
    });
  });

  describe('Manejo y Carga de Archivos', () => {
    const mockFilePayload: UploadedFile = { fileName: 'test.pdf', file: new File([], 'test.pdf') };

    it('debe guardar la monografía y notificar al adjuntar', () => {
      component.openModal('MONOGRAPH');
      component.handleFileUploaded(mockFilePayload);

      expect(component.uploadedMonograph()).toEqual(mockFilePayload);
      expect(component.activeModal()).toBeNull();
      expect(formServiceSpy.notifyFileAttached).toHaveBeenCalledWith('test.pdf');
    });

    it('debe guardar formato E y anexos de manera independiente', () => {
      component.openModal('FORMAT_E');
      component.handleFileUploaded(mockFilePayload);
      expect(component.uploadedFormatE()).toEqual(mockFilePayload);

      component.openModal('ANNEXES');
      component.handleFileUploaded(mockFilePayload);
      expect(component.uploadedAnnexes()).toEqual(mockFilePayload);
    });

    it('debe eliminar el archivo correspondiente al invocar removeFile', () => {
      component.openModal('MONOGRAPH');
      component.handleFileUploaded(mockFilePayload);

      component.removeFile('MONOGRAPH');
      expect(component.uploadedMonograph()).toBeNull();
    });
  });

  describe('Envío del Formulario (submit) y UI', () => {
    it('debe activar isSubmitAttempted y notificar faltantes si no se adjuntan los 3 archivos obligatorios', () => {
      const emitSpy = jest.spyOn(component.onSaveDelivery, 'emit');

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceSpy.notifyMissingDocuments).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debe emitir el evento onSaveDelivery cuando los 3 documentos están presentes', () => {
      const emitSpy = jest.spyOn(component.onSaveDelivery, 'emit');
      const mockFileM = new File([], 'm.pdf');
      const mockFileF = new File([], 'f.pdf');
      const mockFileA = new File([], 'a.pdf');

      component.openModal('MONOGRAPH');
      component.handleFileUploaded({ fileName: 'm.pdf', file: mockFileM });

      component.openModal('FORMAT_E');
      component.handleFileUploaded({ fileName: 'f.pdf', file: mockFileF });

      component.openModal('ANNEXES');
      component.handleFileUploaded({ fileName: 'a.pdf', file: mockFileA });

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceSpy.notifyMissingDocuments).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith({
        monograph: mockFileM,
        formatE: mockFileF,
        annexes: mockFileA
      });
    });

    it('debe pasar la propiedad disabled al botón de guardar si isSubmitting es true', () => {
      // Arrange
      component.isSubmitting = true;
      fixture.detectChanges();

      // Act
      const saveButton = fixture.debugElement.query(By.css('app-button-component[label="Guardar"]'));

      // Assert
      expect(saveButton).toBeTruthy();
      expect(saveButton.componentInstance.disabled).toBe(true);
    });
  });
});
