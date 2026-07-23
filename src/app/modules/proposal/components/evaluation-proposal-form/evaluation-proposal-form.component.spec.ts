import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { EvaluationProposalFormComponent } from './evaluation-proposal-form.component';
import { EvaluationProposalFormService } from './services/evaluation-proposal-form.service';
import { Proposal } from '../../interfaces/proposal.interface';

describe('EvaluationProposalFormComponent', () => {
  let component: EvaluationProposalFormComponent;
  let fixture: ComponentFixture<EvaluationProposalFormComponent>;
  let mockFormService: jest.Mocked<EvaluationProposalFormService>;
  let formBuilder: FormBuilder;

  // Data de prueba
  const mockProposal: Proposal = {
    id: 'prop-123',
    title: 'Sistema de Gestión',
    description: 'Descripción de prueba',
    modality: 'Trabajo de grado',
    state: 'En evaluación',
    authors: [{ id: 'stu-1' }],
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

    // Construimos el mock del servicio
    mockFormService = {
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
    } as unknown as jest.Mocked<EvaluationProposalFormService>;

    await TestBed.configureTestingModule({
      imports: [EvaluationProposalFormComponent] // Al ser standalone, se importa
    })
    .overrideComponent(EvaluationProposalFormComponent, {
      // ESTO ES CLAVE: Sobrescribimos los providers a nivel de componente
      set: {
        providers: [
          { provide: EvaluationProposalFormService, useValue: mockFormService }
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
  });

  describe('Inicialización y Getters', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería consultar el documento original y actual a través del servicio', () => {
      // Invocamos los getters
      const orig = component.originalDocument;
      const curr = component.currentDocument;

      expect(mockFormService.resolveOriginalDocument).toHaveBeenCalledWith(mockProposal);
      expect(mockFormService.resolveCurrentDocument).toHaveBeenCalledWith(mockProposal);
    });

    it('debería calcular isFileInvalid correctamente', () => {
      // Estado inicial (form no enviado, sin archivo)
      expect(component.isFileInvalid).toBe(false);

      // Enviamos el formulario pero sin archivo
      component.formSubmitted.set(true);
      expect(component.isFileInvalid).toBe(true);

      // Agregamos archivo
      component.signedFile.set({ name: 'formatoA.pdf' });
      expect(component.isFileInvalid).toBe(false);
    });
  });

  describe('Delegación de Nombres (UI)', () => {
    it('debería obtener nombres de estudiantes desde el servicio', () => {
      mockFormService.getStudentNames.mockReturnValue('Juan y Maria');
      const result = component.getStudentNames(mockProposal.authors);
      expect(result).toBe('Juan y Maria');
      expect(mockFormService.getStudentNames).toHaveBeenCalledWith(mockProposal.authors);
    });

    it('debería obtener el nombre del director', () => {
      mockFormService.getMemberName.mockReturnValue('Dr. Perez');
      const result = component.getDirectorName('dir-1');
      expect(result).toBe('Dr. Perez');
      expect(mockFormService.getMemberName).toHaveBeenCalledWith('dir-1');
    });

    it('debería manejar codirector y asesor opcionales', () => {
      expect(component.getCodirectorName(undefined)).toBe('');
      expect(component.getAdvisorName(undefined)).toBe('');

      mockFormService.getMemberName.mockReturnValue('Dra. Gomez');
      expect(component.getCodirectorName('codir-1')).toBe('Dra. Gomez');
    });
  });

  describe('Gestión de Archivos y Modales', () => {
    it('debería abrir y cerrar el modal de carga', () => {
      component.setUploadModal(true);
      expect(component.modalState().upload).toBe(true);

      component.setUploadModal(false);
      expect(component.modalState().upload).toBe(false);
    });

    it('debería manejar handleFileUploaded correctamente', () => {
      component.setUploadModal(true); // Abrimos para asegurar que luego se cierre

      component.handleFileUploaded({ fileName: 'evaluacion_firmada.pdf', file: new File([], '') });

      expect(component.signedFile()).toEqual({ name: 'evaluacion_firmada.pdf' });
      expect(component.modalState().upload).toBe(false);
      expect(mockFormService.notifyFileUploaded).toHaveBeenCalled();
    });

    it('debería manejar removeSignedFile correctamente', () => {
      component.signedFile.set({ name: 'archivo.pdf' });

      component.removeSignedFile();

      expect(component.signedFile()).toBeNull();
      expect(mockFormService.notifyFileRemoved).toHaveBeenCalled();
    });
  });

  describe('Flujo de Envío de Evaluación', () => {
    it('debería bloquear el envío y notificar si el formulario es inválido', () => {
      // Aseguramos que el form esté vacío/inválido
      component.evaluationForm.patchValue({ result: '', comments: '' });

      component.initiateEvaluationSubmit();

      expect(component.formSubmitted()).toBe(true);
      expect(mockFormService.notifyInvalidForm).toHaveBeenCalled();
      expect(component.modalState().confirm).toBe(false); // No debe abrir el modal
    });

    it('debería bloquear el envío y notificar si falta el archivo firmado', () => {
      // Hacemos el form válido
      component.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Todo bien' });
      // Aseguramos que no hay archivo
      component.signedFile.set(null);

      component.initiateEvaluationSubmit();

      expect(mockFormService.notifyMissingFile).toHaveBeenCalled();
      expect(component.modalState().confirm).toBe(false);
    });

    it('debería abrir el modal de confirmación si el form es válido y tiene archivo', () => {
      component.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Excelente' });
      component.signedFile.set({ name: 'documento.pdf' });

      component.initiateEvaluationSubmit();

      expect(component.modalState().confirm).toBe(true);
      expect(mockFormService.notifyInvalidForm).not.toHaveBeenCalled();
      expect(mockFormService.notifyMissingFile).not.toHaveBeenCalled();
    });

    it('debería emitir onSaveEvaluation al confirmar y cerrar el modal', () => {
      jest.spyOn(component.onSaveEvaluation, 'emit');

      component.evaluationForm.patchValue({ result: 'No aprobado', comments: 'Falta revisión' });
      component.signedFile.set({ name: 'veredicto.pdf' });
      component.setConfirmModal(true); // Simulamos que el modal está abierto

      component.confirmEvaluation();

      expect(component.modalState().confirm).toBe(false);
      expect(component.onSaveEvaluation.emit).toHaveBeenCalledWith({
        result: 'No aprobado',
        comments: 'Falta revisión',
        signedFileName: 'veredicto.pdf'
      });
    });

    it('debería cerrar el modal al cancelar', () => {
      component.setConfirmModal(true);
      component.cancelEvaluation();
      expect(component.modalState().confirm).toBe(false);
    });
  });

  describe('Emisión de Eventos Simples (Outputs)', () => {
    it('debería emitir onGoBack', () => {
      jest.spyOn(component.onGoBack, 'emit');
      component.goBack();
      expect(component.onGoBack.emit).toHaveBeenCalled();
    });

    it('debería emitir onDownloadOriginal', () => {
      jest.spyOn(component.onDownloadOriginal, 'emit');
      component.downloadOriginalDocument();
      expect(component.onDownloadOriginal.emit).toHaveBeenCalled();
    });
  });
});
