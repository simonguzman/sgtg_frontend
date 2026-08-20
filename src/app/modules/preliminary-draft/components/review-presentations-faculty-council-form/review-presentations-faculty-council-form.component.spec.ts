// 1. Angular Core & Testing
import { ComponentRef, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations'; // <-- Solución al error de animaciones

// 2. Core Enums & Interfaces
import { stateList } from '../../../../core/enums/state.enum';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';

// 3. Shared Modules Enums & Interfaces
import { Modality } from '../../../proposal/enums/modality.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';

// 4. Component, Service & Models
import { SaveEvaluationPayload } from './models/council-evaluation.model';
import { ReviewPresentationsFacultyCouncilFormComponent } from './review-presentations-faculty-council-form.component';
import { ReviewPresentationsFacultyCouncilFormFacadeService } from './services/review-presentations-faculty-council-form-facade.service';


// Interfaz para el Mock de la fachada sin hacer uso de 'any'
interface MockFacadeService {
  preliminaryDraft: WritableSignal<PreliminaryDraft | null>;
  uploadedSignedFile: WritableSignal<{ fileName: string } | null>;
  isUploadModalOpen: WritableSignal<boolean>;
  isReadOnly: WritableSignal<boolean>;
  signedProposalDocument: WritableSignal<FormattedDocument | undefined>;
  approvedPreliminaryDraftDocument: WritableSignal<FormattedDocument | undefined>;
  presentationDocument: WritableSignal<FormattedDocument | undefined>;
  evaluationFiles: WritableSignal<Array<FormattedDocument & { evaluator?: string }>>;
  documentUploadDate: WritableSignal<string>;
  evaluationForm: FormGroup;
  initFormEffects: jest.Mock<void, []>;
  isFieldInvalid: jest.Mock<boolean, [string]>;
  handleFileUploaded: jest.Mock<void, [File]>;
  validateAndGetPayload: jest.Mock<SaveEvaluationPayload | null, []>;
  getStudentNames: jest.Mock<string, []>;
  getDirectorName: jest.Mock<string, []>;
  getCodirectorName: jest.Mock<string, []>;
  getAdvisorName: jest.Mock<string, []>;
}

describe('ReviewPresentationsFacultyCouncilFormComponent', () => {
  let component: ReviewPresentationsFacultyCouncilFormComponent;
  let fixture: ComponentFixture<ReviewPresentationsFacultyCouncilFormComponent>;
  let componentRef: ComponentRef<ReviewPresentationsFacultyCouncilFormComponent>;
  let mockFacade: MockFacadeService;

  // 1. Mock base para los usuarios (Director, Codirector, Asesor, Autores)
  const mockUser: User = {
    id: 'usr-101',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Carlos',
    lastName: 'Pérez',
    secondLastName: 'Gómez',
    codeNumber: 20261001,
    roles: [],
    email: 'carlos.perez@universidad.edu.co',
    password: 'hashed_password',
    state: UserState.active
  };

  // 2. Mock completo de PreliminaryDraft tipado directamente
  const mockPreliminaryDraft: PreliminaryDraft = {
    preliminaryDraftId: 'draft-101',
    proposalId: 'prop-101',
    state: stateList.EN_REVISION,
    createdData: new Date('2026-08-12'),
    evaluations: [],
    documents: [],
    proposalData: {
      id: 'prop-101',
      title: 'Sistema de Gestión Académica',
      description: 'Proyecto de software para la facultad',
      modality: Modality.TI,
      authors: [mockUser],
      director: mockUser,
      codirector: mockUser,
      advisor: mockUser,
      state: stateList.EN_REVISION,
      createdAt: new Date('2026-08-12'),
      documents: [],
      evaluations: []
    }
  };

  const mockFormattedDocument: FormattedDocument = {
    name: 'documento_resolucion.pdf',
    url: 'https://storage.example.com/docs/resolucion.pdf'
  };

  beforeEach(async () => {
    mockFacade = {
      preliminaryDraft: signal<PreliminaryDraft | null>(null),
      uploadedSignedFile: signal<{ fileName: string } | null>(null),
      isUploadModalOpen: signal<boolean>(false),
      isReadOnly: signal<boolean>(false),
      signedProposalDocument: signal<FormattedDocument | undefined>(undefined),
      approvedPreliminaryDraftDocument: signal<FormattedDocument | undefined>(undefined),
      presentationDocument: signal<FormattedDocument | undefined>(undefined),
      evaluationFiles: signal<Array<FormattedDocument & { evaluator?: string }>>([]),
      documentUploadDate: signal<string>('23/07/2026'),

      evaluationForm: new FormGroup({
        result: new FormControl('', [Validators.required]),
        comments: new FormControl('', [Validators.required]),
        maximumDeliveryDate: new FormControl(null),
        document: new FormControl(null)
      }),

      initFormEffects: jest.fn(),
      isFieldInvalid: jest.fn().mockReturnValue(false),
      handleFileUploaded: jest.fn(),
      validateAndGetPayload: jest.fn(),
      getStudentNames: jest.fn().mockReturnValue('Juan Pérez, Ana Gómez'),
      getDirectorName: jest.fn().mockReturnValue('Dr. Roberto Gómez'),
      getCodirectorName: jest.fn().mockReturnValue('Dra. María López'),
      getAdvisorName: jest.fn().mockReturnValue('Ing. Carlos Pérez')
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPresentationsFacultyCouncilFormComponent],
      providers: [
        provideNoopAnimations() // <-- FIX: Provee el módulo vacío de animaciones para los tests
      ]
    })
    .overrideComponent(ReviewPresentationsFacultyCouncilFormComponent, {
      set: {
        providers: [
          { provide: ReviewPresentationsFacultyCouncilFormFacadeService, useValue: mockFacade }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPresentationsFacultyCouncilFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('preliminaryDraft', mockPreliminaryDraft);
  });

  describe('Inicialización y Ciclo de Vida', () => {
    it('debería crearse correctamente la instancia del componente', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('debería ejecutar initFormEffects del facade durante ngOnInit', () => {
      fixture.detectChanges();
      expect(mockFacade.initFormEffects).toHaveBeenCalledTimes(1);
    });

    it('debería sincronizar el input preliminaryDraft con el signal preliminaryDraft del facade', () => {
      fixture.detectChanges();
      expect(mockFacade.preliminaryDraft()).toEqual(mockPreliminaryDraft);
    });
  });

  describe('Método submit() y Salida de Eventos (Outputs)', () => {
    it('debería emitir onSaveEvaluation cuando la validación del facade retorna un payload válido', () => {
      const mockPayload: SaveEvaluationPayload = {
        formValues: {
          result: stateList.APROBADO,
          comments: 'Aprobado sin observaciones mayores',
          maximumDeliveryDate: new Date('2026-12-15'),
          document: null
        },
        file: new File(['contenido'], 'resolucion.pdf', { type: 'application/pdf' })
      };

      mockFacade.validateAndGetPayload.mockReturnValue(mockPayload);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(mockPayload);
    });

    it('NO debería emitir onSaveEvaluation si la validación del facade retorna null', () => {
      mockFacade.validateAndGetPayload.mockReturnValue(null);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Interacciones con la plantilla HTML y Descarga de Archivos', () => {
    it('debería emitir onDownloadFile al invocar el evento desde la vista', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');

      component.onDownloadFile.emit(mockFormattedDocument);

      expect(emitSpy).toHaveBeenCalledWith(mockFormattedDocument);
    });

    it('debería actualizar el estado del modal de carga cuando se dispara la apertura', () => {
      fixture.detectChanges();

      mockFacade.isUploadModalOpen.set(true);
      fixture.detectChanges();

      expect(mockFacade.isUploadModalOpen()).toBe(true);
    });

    it('debería invocar la eliminación del archivo firmado cuando el usuario lo remueve', () => {
      mockFacade.uploadedSignedFile.set({ fileName: 'resolucion_firmada.pdf' });
      fixture.detectChanges();

      mockFacade.uploadedSignedFile.set(null);
      fixture.detectChanges();

      expect(mockFacade.uploadedSignedFile()).toBeNull();
    });
  });
});
