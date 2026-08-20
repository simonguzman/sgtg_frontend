import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { EvaluationProposalFormComponent } from './evaluation-proposal-form.component';
import { EvaluationProposalFormService } from './services/evaluation-proposal-form.service';
import { Proposal } from '../../interfaces/proposal.interface';
import { User } from '../../../users/interfaces/user.interface';

describe('EvaluationProposalFormComponent', () => {
  let component: EvaluationProposalFormComponent;
  let fixture: ComponentFixture<EvaluationProposalFormComponent>;
  let formServiceMock: {
    evaluationForm: any; // Se inyecta un FormGroup real, no requiere mockeo de funciones internas del form
    resolveOriginalDocument: jest.Mock;
    resolveCurrentDocument: jest.Mock;
    formatUploadDate: jest.Mock;
    getStudentNames: jest.Mock;
    getMemberName: jest.Mock;
    notifyFileUploaded: jest.Mock;
    notifyFileRemoved: jest.Mock;
    notifyInvalidForm: jest.Mock;
    notifyMissingFile: jest.Mock;
  };
  let formBuilder: FormBuilder;

  // Creamos un archivo File real simulado para las pruebas
  const mockFile = new File(['dummy content'], 'documento.pdf', { type: 'application/pdf' });

  // SOLUCIÓN AL ERROR TS2352: Usamos "as unknown as Tipo" para mocks incompletos
  const mockAuthors = [{ id: 'stu-1' }] as unknown as User[];

  const mockProposal = {
    id: 'prop-123',
    title: 'Sistema de Gestión',
    description: 'Descripción de prueba',
    modality: 'Trabajo de grado',
    state: 'En evaluación',
    authors: mockAuthors,
    director: { id: 'dir-1' },
    codirector: { id: 'codir-1' },
    advisor: { id: 'adv-1' },
    documents: []
  } as unknown as Proposal;

  beforeEach(async () => {
    formBuilder = new FormBuilder();

    // Creamos un FormGroup real para que el HTML del componente pueda interactuar con él
    const mockEvaluationForm = formBuilder.group({
      result: ['', Validators.required],
      comments: ['', Validators.required]
    });

    // Construimos el mock del servicio con funciones tipadas de Jest
    formServiceMock = {
      evaluationForm: mockEvaluationForm,
      resolveOriginalDocument: jest.fn(),
      resolveCurrentDocument: jest.fn(),
      formatUploadDate: jest.fn(),
      getStudentNames: jest.fn(),
      getMemberName: jest.fn(),
      notifyFileUploaded: jest.fn(),
      notifyFileRemoved: jest.fn(),
      notifyInvalidForm: jest.fn(),
      notifyMissingFile: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EvaluationProposalFormComponent]
    })
    .overrideComponent(EvaluationProposalFormComponent, {
      set: {
        providers: [
          { provide: EvaluationProposalFormService, useValue: formServiceMock }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationProposalFormComponent);
    component = fixture.componentInstance;

    // Seteamos el signal input requerido ANTES del primer detectChanges
    fixture.componentRef.setInput('proposal', mockProposal);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Getters', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería consultar el documento original y actual a través del servicio', () => {
      const orig = component.originalDocument;
      const curr = component.currentDocument;

      expect(formServiceMock.resolveOriginalDocument).toHaveBeenCalledWith(mockProposal);
      expect(formServiceMock.resolveCurrentDocument).toHaveBeenCalledWith(mockProposal);
    });

    it('debería calcular isFileInvalid correctamente', () => {
      expect(component.isFileInvalid).toBeFalsy();

      // Enviamos el formulario pero sin archivo
      component.formSubmitted.set(true);
      expect(component.isFileInvalid).toBeTruthy();

      // Agregamos archivo real
      component.signedFile.set({ name: 'formatoA.pdf', file: mockFile });
      expect(component.isFileInvalid).toBeFalsy();
    });
  });

  describe('Delegación de Nombres (UI)', () => {
    it('debería obtener nombres de estudiantes desde el servicio', () => {
      formServiceMock.getStudentNames.mockReturnValue('Juan y Maria');
      const result = component.getStudentNames(mockProposal.authors);

      expect(result).toBe('Juan y Maria');
      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(mockProposal.authors);
    });

    it('debería obtener el nombre del director', () => {
      formServiceMock.getMemberName.mockReturnValue('Dr. Perez');
      const result = component.getDirectorName('dir-1');

      expect(result).toBe('Dr. Perez');
      expect(formServiceMock.getMemberName).toHaveBeenCalledWith('dir-1');
    });

    it('debería manejar codirector y asesor opcionales', () => {
      expect(component.getCodirectorName(undefined)).toBe('');
      expect(component.getAdvisorName(undefined)).toBe('');

      formServiceMock.getMemberName.mockReturnValue('Dra. Gomez');
      expect(component.getCodirectorName('codir-1')).toBe('Dra. Gomez');
    });
  });

  describe('Gestión de Archivos y Modales', () => {
    it('debería abrir y cerrar el modal de carga', () => {
      component.setUploadModal(true);
      expect(component.modalState().upload).toBeTruthy();

      component.setUploadModal(false);
      expect(component.modalState().upload).toBeFalsy();
    });

    it('debería manejar handleFileUploaded guardando el objeto File real', () => {
      component.setUploadModal(true);

      component.handleFileUploaded({ fileName: 'evaluacion_firmada.pdf', file: mockFile });

      expect(component.signedFile()).toEqual({ name: 'evaluacion_firmada.pdf', file: mockFile });
      expect(component.modalState().upload).toBeFalsy();
      expect(formServiceMock.notifyFileUploaded).toHaveBeenCalledTimes(1);
    });

    it('debería manejar removeSignedFile correctamente', () => {
      component.signedFile.set({ name: 'archivo.pdf', file: mockFile });

      component.removeSignedFile();

      expect(component.signedFile()).toBeNull();
      expect(formServiceMock.notifyFileRemoved).toHaveBeenCalledTimes(1);
    });
  });

  describe('Flujo de Envío de Evaluación', () => {
    it('debería bloquear el envío y notificar si el formulario es inválido', () => {
      component.evaluationForm.patchValue({ result: '', comments: '' });

      component.initiateEvaluationSubmit();

      expect(component.formSubmitted()).toBeTruthy();
      expect(formServiceMock.notifyInvalidForm).toHaveBeenCalledTimes(1);
      expect(component.modalState().confirm).toBeFalsy();
    });

    it('debería bloquear el envío y notificar si falta el archivo firmado', () => {
      component.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Todo bien' });
      component.signedFile.set(null);

      component.initiateEvaluationSubmit();

      expect(formServiceMock.notifyMissingFile).toHaveBeenCalledTimes(1);
      expect(component.modalState().confirm).toBeFalsy();
    });

    it('debería abrir el modal de confirmación si el form es válido y tiene archivo', () => {
      component.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Excelente' });
      component.signedFile.set({ name: 'documento.pdf', file: mockFile });

      component.initiateEvaluationSubmit();

      expect(component.modalState().confirm).toBeTruthy();
      expect(formServiceMock.notifyInvalidForm).not.toHaveBeenCalled();
      expect(formServiceMock.notifyMissingFile).not.toHaveBeenCalled();
    });

    it('debería emitir onSaveEvaluation con el objeto File real al confirmar y cerrar el modal', () => {
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.evaluationForm.patchValue({ result: 'No aprobado', comments: 'Falta revisión' });
      component.signedFile.set({ name: 'veredicto.pdf', file: mockFile });

      component.setConfirmModal(true);
      component.confirmEvaluation();

      expect(component.modalState().confirm).toBeFalsy();
      // Validamos que se envíe el objeto File real en lugar del string
      expect(emitSpy).toHaveBeenCalledWith({
        result: 'No aprobado',
        comments: 'Falta revisión',
        file: mockFile
      });
    });

    it('debería cerrar el modal al cancelar', () => {
      component.setConfirmModal(true);
      component.cancelEvaluation();
      expect(component.modalState().confirm).toBeFalsy();
    });
  });

  describe('Emisión de Eventos Simples (Outputs)', () => {
    it('debería emitir onGoBack', () => {
      const emitSpy = jest.spyOn(component.onGoBack, 'emit');
      component.goBack();
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('debería emitir onDownloadOriginal', () => {
      const emitSpy = jest.spyOn(component.onDownloadOriginal, 'emit');
      component.downloadOriginalDocument();
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });
});
