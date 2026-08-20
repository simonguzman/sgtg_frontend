import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { EvaluateSustentationFormComponent } from './evaluate-sustentation-form.component';
import { EvaluateSustentationFormService } from './services/evaluate-sustentation-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../interfaces/sustentation-registry.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';

describe('EvaluateSustentationFormComponent', () => {
  let component: EvaluateSustentationFormComponent;
  let fixture: ComponentFixture<EvaluateSustentationFormComponent>;

  // Tipado estructural estricto para los mocks
  let formServiceMock: {
    getStudentNames: jest.Mock;
    getDirectorName: jest.Mock;
    getCodirectorName: jest.Mock;
    getAdvisorName: jest.Mock;
    getAssignedJurors: jest.Mock;
    getExistingDocument: jest.Mock;
    notifyFileAttached: jest.Mock;
    notifyMissingVerdict: jest.Mock;
    notifyMissingFile: jest.Mock;
  };

  // Mock seguro de ThesisWork reutilizable
  const mockThesisWork = {
    preliminaryDraftData: { proposalData: { title: 'Test Title' } },
    sustentations: []
  } as unknown as ThesisWork;

  beforeEach(async () => {
    formServiceMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn(),
      getExistingDocument: jest.fn(),
      notifyFileAttached: jest.fn(),
      notifyMissingVerdict: jest.fn(),
      notifyMissingFile: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateSustentationFormComponent, DatePipe, ReactiveFormsModule],
      schemas: [NO_ERRORS_SCHEMA] // Ignora etiquetas de componentes hijos en la plantilla y evita NG0300
    })
    .overrideComponent(EvaluateSustentationFormComponent, {
      set: {
        providers: [
          { provide: EvaluateSustentationFormService, useValue: formServiceMock }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSustentationFormComponent);
    component = fixture.componentInstance;

    // Asignación de @Input obligatorio antes del ciclo de vida
    component.thesisWork = mockThesisWork;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpieza del estado de los espías entre pruebas
  });

  describe('Inicialización y Getters de Entidad', () => {
    it('debería retornar la sustentación actual si existe en el arreglo', () => {
      const mockSustentation = { location: 'Aula 101' } as SustentationRegistry;
      component.thesisWork = { ...mockThesisWork, sustentations: [mockSustentation] } as ThesisWork;

      expect(component.currentSustentation).toEqual(mockSustentation);
    });

    it('debería retornar null si no hay sustentaciones registradas', () => {
      component.thesisWork = { ...mockThesisWork, sustentations: [] } as ThesisWork;
      expect(component.currentSustentation).toBeNull();
    });
  });

  describe('Delegación al Servicio Formulario (Getters)', () => {
    it('debería delegar las consultas de participantes al servicio', () => {
      formServiceMock.getStudentNames.mockReturnValue('Juan Perez');
      expect(component.getStudentNames()).toBe('Juan Perez');
      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(component.thesisWork);

      component.getDirectorName();
      expect(formServiceMock.getDirectorName).toHaveBeenCalledWith(component.thesisWork);

      component.getCodirectorName();
      expect(formServiceMock.getCodirectorName).toHaveBeenCalledWith(component.thesisWork);

      component.getAdvisorName();
      expect(formServiceMock.getAdvisorName).toHaveBeenCalledWith(component.thesisWork);
    });

    it('debería delegar la consulta de jurados y documentos', () => {
      component.getAssignedJurors();
      expect(formServiceMock.getAssignedJurors).toHaveBeenCalledWith(component.currentSustentation);

      component.getExistingDocument('MONOGRAFIA');
      expect(formServiceMock.getExistingDocument).toHaveBeenCalledWith(component.thesisWork, 'MONOGRAFIA');
    });
  });

  describe('Interacción de Usuario y Manejo de Archivos', () => {
    it('debería emitir el evento onDownloadFile con el documento válido', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');
      const mockDoc: FileDocument = {
        id: 'liasndnaslcnasjlk',
        name: 'doc.pdf',
        url: 'https://ruta-falsa.com/doc.pdf',
        uploadDate: new Date(),
        type: DocumentType.MONOGRAFIA
      };

      component.downloadDocument(mockDoc);
      expect(emitSpy).toHaveBeenCalledWith(mockDoc);
    });

    it('no debería emitir descarga si el documento es nulo o indefinido', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');
      component.downloadDocument(null);
      component.downloadDocument(undefined);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería actualizar el estado y notificar al subir un archivo', () => {
      const fileData = { fileName: 'acta_final.pdf', file: new File([''], 'acta_final.pdf') };
      component.isModalOpen.set(true);

      component.handleFileUploaded(fileData);

      expect(component.uploadedFormat()).toEqual(fileData);
      expect(component.isModalOpen()).toBe(false);
      expect(formServiceMock.notifyFileAttached).toHaveBeenCalledWith('acta_final.pdf');
    });

    it('debería limpiar el archivo subido al ejecutar removeFile', () => {
      component.uploadedFormat.set({ fileName: 'test.pdf', file: new File([''], 'test.pdf') });
      component.removeFile();
      expect(component.uploadedFormat()).toBeNull();
    });

    it('debería actualizar el signal de observaciones al detectar un input', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Se aprueba con cambios menores';
      const mockEvent = new Event('input');
      Object.defineProperty(mockEvent, 'target', { writable: false, value: textarea });

      component.onObservationsChange(mockEvent);

      expect(component.observations()).toBe('Se aprueba con cambios menores');
    });
  });

  describe('Validación y Envío del Formulario (Submit)', () => {
    it('debería detenerse y notificar si falta seleccionar un veredicto', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.verdictSelected.set(null);
      component.uploadedFormat.set({ fileName: 'acta.pdf', file: new File([''], '') });

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingVerdict).toHaveBeenCalled();
      expect(formServiceMock.notifyMissingFile).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería detenerse y notificar si falta el archivo adjunto (acta)', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.verdictSelected.set(stateList.APROBADO);
      component.uploadedFormat.set(null);

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingFile).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería emitir onSave con el payload correcto si supera validaciones', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      const mockFile = new File([''], 'acta_firmada.pdf');

      component.verdictSelected.set(stateList.APROBADO_CON_OBSERVACIONES);
      component.observations.set('Corregir bibliografía');
      component.uploadedFormat.set({ fileName: 'acta_firmada.pdf', file: mockFile });

      component.submit();

      expect(emitSpy).toHaveBeenCalledWith({
        payload: {
          veredict: stateList.APROBADO_CON_OBSERVACIONES,
          observations: 'Corregir bibliografía',
          evaluationDate: expect.any(Date)
        },
        file: mockFile
      });
    });
  });
});
