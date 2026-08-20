// 1. Angular Core & Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';

// 2. Componentes y Servicios a Probar
import { UploadAdvanceFormComponent } from './upload-advance-form.component';
import { UploadAdvanceFormService } from './services/upload-advance-form.service';

// 3. Interfaces y Enums Compartidos
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { Modality } from '../../../proposal/enums/modality.enum';

// 4. Interfaz Estricta para el Mock del Servicio
interface MockUploadAdvanceFormService {
  advanceForm: FormGroup;
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  notifyIncompleteForm: jest.Mock<void, []>;
  notifyMissingFiles: jest.Mock<void, []>;
}

describe('UploadAdvanceFormComponent', () => {
  let component: UploadAdvanceFormComponent;
  let fixture: ComponentFixture<UploadAdvanceFormComponent>;
  let formServiceSpy: MockUploadAdvanceFormService;

  // 1. Mock de User estrictamente tipado
  const mockUser: User = {
    id: 'user-1',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Ana',
    lastName: 'López',
    secondLastName: 'Díaz',
    codeNumber: 20262002,
    roles: [],
    email: 'ana@universidad.edu.co',
    password: 'hash',
    state: UserState.active
  };

  // 2. Mock de ThesisWork estrictamente tipado (Sin as unknown)
  const mockThesisWork: ThesisWork = {
    thesisWorkId: 'thesis-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
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
        title: 'Título de Prueba del Avance',
        description: 'Descripción detallada de prueba',
        modality: Modality.TI,
        authors: [mockUser],
        director: mockUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    }
  };

  beforeEach(async () => {
    // Inicializamos un formulario real para el mock.
    const fb = new FormBuilder();
    const mockForm = fb.nonNullable.group({
      title: ['', Validators.required],
      comments: ['', Validators.required]
    });

    // Construcción estricta del Mock Service
    formServiceSpy = {
      advanceForm: mockForm,
      getStudentNames: jest.fn().mockReturnValue('Ana López'),
      getDirectorName: jest.fn().mockReturnValue('Director Test'),
      getCodirectorName: jest.fn().mockReturnValue(''),
      getAdvisorName: jest.fn().mockReturnValue(''),
      notifyIncompleteForm: jest.fn(),
      notifyMissingFiles: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UploadAdvanceFormComponent, ReactiveFormsModule]
    })
    .overrideComponent(UploadAdvanceFormComponent, {
      set: { providers: [{ provide: UploadAdvanceFormService, useValue: formServiceSpy }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadAdvanceFormComponent);
    component = fixture.componentInstance;

    // Asignamos el @Input requerido antes de detectar cambios
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar la información de solo lectura usando los templates', () => {
      // SOLUCIÓN: Buscamos los inputs y textareas específicos porque usan la propiedad [value]
      const disabledInputs = fixture.debugElement.queryAll(By.css('input[disabled]'));
      const disabledTextarea = fixture.debugElement.query(By.css('textarea[disabled]'));

      // disabledInputs[0] -> Título
      expect(disabledInputs[0].nativeElement.value).toBe('Título de Prueba del Avance');

      // disabledTextarea -> Descripción
      expect(disabledTextarea.nativeElement.value).toBe('Descripción detallada de prueba');

      // disabledInputs[1] -> Modalidad
      expect(disabledInputs[1].nativeElement.value).toBe(mockThesisWork.preliminaryDraftData.proposalData.modality);

      // disabledInputs[2] -> Estudiante
      expect(disabledInputs[2].nativeElement.value).toBe('Ana López');

      // disabledInputs[3] -> Director
      expect(disabledInputs[3].nativeElement.value).toBe('Director Test');
    });
  });

  describe('Validación visual del formulario (isFieldInvalid)', () => {
    it('debería retornar true si el campo es inválido y fue tocado', () => {
      const titleControl = component.advanceForm.controls['title'];
      titleControl.setValue('');
      titleControl.markAsTouched();

      expect(component.isFieldInvalid('title')).toBe(true);
    });

    it('debería retornar false si el campo es inválido pero NO fue tocado', () => {
      const titleControl = component.advanceForm.controls['title'];
      titleControl.setValue('');
      titleControl.markAsUntouched();

      expect(component.isFieldInvalid('title')).toBe(false);
    });
  });

  describe('Gestión de Archivos (Signals)', () => {
    it('handleFileUploaded debería agregar el archivo al signal y cerrar el modal', () => {
      const mockFileEvent = { fileName: 'documento.pdf', file: new File([], 'documento.pdf') };

      component.isUploadModalOpen.set(true);
      component.handleFileUploaded(mockFileEvent);

      expect(component.uploadedFiles()).toHaveLength(1);
      expect(component.uploadedFiles()[0]).toEqual(mockFileEvent);
      expect(component.isUploadModalOpen()).toBe(false);
    });

    it('removeFile debería eliminar el archivo correspondiente por su índice', () => {
      const file1 = { fileName: '1.pdf', file: new File([], '1.pdf') };
      const file2 = { fileName: '2.pdf', file: new File([], '2.pdf') };

      component.uploadedFiles.set([file1, file2]);
      component.removeFile(0); // Eliminamos el primero

      expect(component.uploadedFiles()).toHaveLength(1);
      expect(component.uploadedFiles()[0].fileName).toBe('2.pdf'); // Debe quedar el segundo
    });
  });

  describe('Envío del formulario (submit)', () => {
    it('debería bloquear el envío, marcar campos como tocados y notificar si el formulario es inválido', () => {
      jest.spyOn(component.onSaveAdvance, 'emit');

      // Hacemos el formulario inválido
      component.advanceForm.controls['title'].setValue('');

      component.submit();

      expect(component.advanceForm.touched).toBe(true);
      expect(formServiceSpy.notifyIncompleteForm).toHaveBeenCalledTimes(1);
      expect(component.onSaveAdvance.emit).not.toHaveBeenCalled();
    });

    it('debería bloquear el envío y notificar si no hay archivos cargados', () => {
      jest.spyOn(component.onSaveAdvance, 'emit');

      // Hacemos el formulario válido
      component.advanceForm.setValue({ title: 'Avance 1', comments: 'Todo bien' });
      // Nos aseguramos de que el signal de archivos esté vacío
      component.uploadedFiles.set([]);

      component.submit();

      expect(formServiceSpy.notifyMissingFiles).toHaveBeenCalledTimes(1);
      expect(component.onSaveAdvance.emit).not.toHaveBeenCalled();
    });

    it('debería emitir onSaveAdvance con el payload correcto si todo es válido', () => {
      jest.spyOn(component.onSaveAdvance, 'emit');
      const mockFile = new File([], 'avance_final.pdf');

      // Estado válido: formulario lleno y archivo cargado
      component.advanceForm.setValue({ title: 'Avance Final', comments: 'Revisar capítulo 3' });
      component.uploadedFiles.set([{ fileName: 'avance_final.pdf', file: mockFile }]);

      component.submit();

      // Validación estricta del @Output
      expect(component.onSaveAdvance.emit).toHaveBeenCalledWith({
        formValues: { title: 'Avance Final', comments: 'Revisar capítulo 3' },
        files: [mockFile]
      });

      // Asegurar que las notificaciones de error NO fueron llamadas
      expect(formServiceSpy.notifyIncompleteForm).not.toHaveBeenCalled();
      expect(formServiceSpy.notifyMissingFiles).not.toHaveBeenCalled();
    });
  });
});
