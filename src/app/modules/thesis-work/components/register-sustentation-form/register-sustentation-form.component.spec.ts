import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterSustentationFormComponent } from './register-sustentation-form.component';
import { RegisterSustentationFormService } from './services/register-sustentation-form.service';
import { FormBuilder, Validators } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { Modality } from '../../../proposal/enums/modality.enum';

describe('RegisterSustentationFormComponent', () => {
  let component: RegisterSustentationFormComponent;
  let fixture: ComponentFixture<RegisterSustentationFormComponent>;
  let formServiceMock: jest.Mocked<Partial<RegisterSustentationFormService>>;

  // Usamos fb.nonNullable.group para igualar exactamente la estructura de tipos del servicio
  const fb = new FormBuilder();
  const mockForm = fb.nonNullable.group({
    sustentationDate: ['', Validators.required],
    location: ['', Validators.required],
    juror1: ['', Validators.required],
    juror2: ['', Validators.required]
  });

  const mockThesisWork = {
    preliminaryDraftData: {
      proposalData: { title: 'Test Title', modality: Modality.TI, description: 'Test Desc' }
    }
  } as ThesisWork;

  const mockUsers: Partial<User>[] = [
    { id: 'j1', firstName: 'Jurado', lastName: 'Uno' },
    { id: 'j2', firstName: 'Jurado', lastName: 'Dos' },
    { id: 'j3', firstName: 'Jurado', lastName: 'Tres' }
  ];

  beforeEach(async () => {
    // Reseteamos el estado del formulario antes de cada prueba
    mockForm.reset();

    formServiceMock = {
      form: mockForm,
      getEligibleJurors: jest.fn().mockReturnValue(mockUsers as User[]),
      getMemberFullName: jest.fn().mockImplementation((u: User) => `${u.firstName} ${u.lastName}`),
      getStudentNames: jest.fn().mockReturnValue('Estudiante Test'),
      getDirectorName: jest.fn().mockReturnValue('Director Test'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector Test'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor Test'),
      getExistingDocument: jest.fn(),
      notifyIncompleteForm: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        RegisterSustentationFormComponent,
        NoopAnimationsModule // Previene errores de animación por el DatePicker de PrimeNG
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(RegisterSustentationFormComponent, {
      set: {
        providers: [{ provide: RegisterSustentationFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSustentationFormComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Signals (Signals & Computeds)', () => {
    it('debería calcular las opciones de juror1 correctamente usando getEligibleJurors', () => {
      const options = component.juror1Options();
      expect(options).toHaveLength(3);
      expect(options[0].label).toBe('Jurado Uno');
      expect(formServiceMock.getEligibleJurors).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería limpiar juror2 si se selecciona en juror1 el mismo ID y filtrar juror2Options', () => {
      // Configuramos un estado inicial
      component.form.get('juror2')?.setValue('j2');

      // Simulamos la selección del jurado 2 en el selector del jurado 1
      component.form.get('juror1')?.setValue('j2');
      fixture.detectChanges();

      // El jurado 2 debió ser reseteado
      expect(component.form.get('juror2')?.value).toBe('');

      // juror2Options ya no debería incluir al 'j2'
      const j2Options = component.juror2Options();
      expect(j2Options.find(opt => opt.id === 'j2')).toBeUndefined();
      expect(j2Options).toHaveLength(2); // Quedan j1 y j3
    });

    it('debería retornar el nombre por defecto para uploadedFileName si no hay archivo', () => {
      component.uploadedFormatE.set(null);
      expect(component.uploadedFileName()).toBe('Formato_E - Sustentación');
    });

    it('debería retornar el nombre del archivo cargado en uploadedFileName', () => {
      const file = new File([''], 'formato_e_firmado.pdf');
      component.uploadedFormatE.set({ fileName: 'formato_e_firmado.pdf', file });
      expect(component.uploadedFileName()).toBe('formato_e_firmado.pdf');
    });
  });

  describe('Delegaciones al Servicio (UI Helpers)', () => {
    it('debería delegar la obtención de nombres al servicio', () => {
      expect(component.getStudentNames()).toBe('Estudiante Test');
      expect(component.getDirectorName()).toBe('Director Test');
      expect(component.getCodirectorName()).toBe('Codirector Test');
      expect(component.getAdvisorName()).toBe('Asesor Test');

      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getMemberFullName al servicio', () => {
      const user = { firstName: 'Juan', lastName: 'Perez' } as User;
      component.getMemberFullName(user);
      expect(formServiceMock.getMemberFullName).toHaveBeenCalledWith(user);
    });

    it('debería delegar getExistingDocument al servicio', () => {
      component.getExistingDocument('MONOGRAFIA');
      expect(formServiceMock.getExistingDocument).toHaveBeenCalledWith(mockThesisWork, 'MONOGRAFIA');
    });
  });

  describe('Validaciones de Campos de la UI (isFieldInvalid / isFieldValid)', () => {
    it('isFieldInvalid debería ser true si el campo es inválido y fue tocado', () => {
      const control = component.form.get('location');
      control?.markAsTouched();
      expect(component.isFieldInvalid('location')).toBe(true);
    });

    it('isFieldInvalid debería ser true si hay intento de envío (isSubmitAttempted) y es inválido', () => {
      component.isSubmitAttempted.set(true);
      expect(component.isFieldInvalid('location')).toBe(true);
    });

    it('isFieldValid debería ser true si el campo es válido y fue tocado o hay intento de envío', () => {
      const control = component.form.get('location');
      control?.setValue('Auditorio Principal');

      expect(component.isFieldValid('location')).toBe(false); // Válido pero no tocado/enviado

      control?.markAsTouched();
      expect(component.isFieldValid('location')).toBe(true); // Válido y tocado
    });
  });

  describe('Manejo de Archivos', () => {
    it('debería emitir onDownloadFile solo si el documento no es nulo', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');

      // Caso nulo
      component.downloadDocument(null);
      expect(emitSpy).not.toHaveBeenCalled();

      // Caso exitoso
      const mockDoc = { id: 'doc1', name: 'archivo.pdf' } as FileDocument;
      component.downloadDocument(mockDoc);
      expect(emitSpy).toHaveBeenCalledWith(mockDoc);
    });

    it('handleFileUploaded debería guardar el archivo y cerrar el modal', () => {
      component.isModalOpen.set(true);
      const mockEvent = { fileName: 'test.pdf', file: new File([''], 'test.pdf') };

      component.handleFileUploaded(mockEvent);

      expect(component.uploadedFormatE()).toEqual(mockEvent);
      expect(component.isModalOpen()).toBe(false);
    });
  });

  describe('Envío del Formulario (submit)', () => {
    it('debería marcar campos como tocados, intentar envío y notificar si es inválido (campos vacíos)', () => {
      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(component.form.touched).toBe(true);
      expect(formServiceMock.notifyIncompleteForm).toHaveBeenCalled();
    });

    it('debería notificar error si el formulario es válido pero falta el archivo', () => {
      component.form.setValue({
        sustentationDate: '2026-08-18T10:00:00',
        location: 'Auditorio',
        juror1: 'j1',
        juror2: 'j2'
      });
      component.uploadedFormatE.set(null); // Sin archivo

      component.submit();

      expect(formServiceMock.notifyIncompleteForm).toHaveBeenCalled();
    });

    it('debería emitir onSave con los valores crudos (raw value) y el archivo si todo es correcto', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      const mockFile = new File([''], 'test.pdf');
      const mockDateStr = '2026-08-18T10:00:00';

      component.form.setValue({
        sustentationDate: mockDateStr,
        location: 'Auditorio',
        juror1: 'j1',
        juror2: 'j2'
      });
      component.uploadedFormatE.set({ fileName: 'test.pdf', file: mockFile });

      component.submit();

      expect(formServiceMock.notifyIncompleteForm).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith({
        payload: {
          sustentationDate: mockDateStr,
          location: 'Auditorio',
          juror1: 'j1',
          juror2: 'j2'
        },
        file: mockFile
      });
    });
  });
});
