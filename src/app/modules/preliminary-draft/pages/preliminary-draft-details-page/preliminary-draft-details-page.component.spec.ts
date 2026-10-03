import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { Modality } from '../../../proposal/enums/modality.enum';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { PreliminaryDraftDetailsPageComponent } from './preliminary-draft-details-page.component';
import { PreliminaryDraftDetailsPageService } from './services/preliminary-draft-details-page.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  lastName: 'Pérez',
  secondLastName: 'Gómez',
  codeNumber: 20261001,
  roles: [],
  email: 'juan@universidad.edu.co',
  password: 'hash',
  state: UserState.active,
  ...overrides
} as User);

const createMockDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'Documento_Anteproyecto_Final.pdf',
  url: 'http://docs/documento.pdf',
  uploadDate: '12/08/2026',
  type: DocumentType.ANTEPROYECTO,
  ...overrides
} as FileDocument);

type ProposalData = NonNullable<PreliminaryDraft['proposalData']>;
const createMockProposalData = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: 'prop-1',
  title: 'Sistema Inteligente de Gestión',
  description: 'Descripción detallada del sistema',
  modality: Modality.TI,
  authors: [createMockUser()],
  director: createMockUser(),
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  ...overrides
} as ProposalData);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.EN_REVISION,
  createdData: new Date(),
  evaluations: [],
  documents: [createMockDocument()],
  proposalData: createMockProposalData(),
  ...overrides
} as PreliminaryDraft);

@Component({
  selector: 'app-button-component',
  standalone: true,
  template: '<button (click)="onClick.emit()">{{ label }}</button>'
})
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Output() onClick = new EventEmitter<void>();
}

interface MockPageService {
  init: jest.Mock<void, []>;
  goBack: jest.Mock<void, []>;
  navigateToEvaluations: jest.Mock<void, []>;
  navigateToDocuments: jest.Mock<void, []>;
  downloadDocument: jest.Mock<void, []>;
  getMemberName: jest.Mock<string, [string | undefined]>;
  getAuthors: jest.Mock<string, [User[] | undefined]>;
  preliminaryDraftDetails: WritableSignal<PreliminaryDraft | null>;
  mainDocument: WritableSignal<FileDocument | null>;
}

describe('PreliminaryDraftDetailsPageComponent', () => {
  let component: PreliminaryDraftDetailsPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftDetailsPageComponent>;
  let mockPageService: MockPageService;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockPageService = {
      init: jest.fn(),
      goBack: jest.fn(),
      navigateToEvaluations: jest.fn(),
      navigateToDocuments: jest.fn(),
      downloadDocument: jest.fn(),
      getMemberName: jest.fn().mockReturnValue('Nombre Miembro Mock'),
      getAuthors: jest.fn().mockReturnValue('Autores Mock'),
      preliminaryDraftDetails: signal<PreliminaryDraft | null>(null),
      mainDocument: signal<FileDocument | null>(null)
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftDetailsPageComponent]
    })
    .overrideComponent(PreliminaryDraftDetailsPageComponent, {
      remove: {
        imports: [ButtonComponent]
      },
      add: {
        imports: [MockButtonComponent],
        providers: [
          { provide: PreliminaryDraftDetailsPageService, useValue: mockPageService }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftDetailsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización y renderizado condicional', () => {
    it('debería crearse e inicializar el servicio en ngOnInit', () => {
      fixture.detectChanges();

      expect(component).toBeTruthy();
      expect(mockPageService.init).toHaveBeenCalledTimes(1);
    });

    it('debería mostrar mensaje de carga cuando la signal preliminaryDraftDetails es null', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Cargando información del anteproyecto...');
    });

    it('debería renderizar la información principal cuando existen detalles del anteproyecto', () => {
      const draft = createMockDraft();
      const document = createMockDocument();

      mockPageService.preliminaryDraftDetails.set(draft);
      mockPageService.mainDocument.set(document);

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.textContent).not.toContain('Cargando información del anteproyecto...');

      expect(compiled.textContent).toContain('Sistema Inteligente de Gestión');
      expect(compiled.textContent).toContain('Descripción detallada del sistema');
      expect(compiled.textContent).toContain('Documento_Anteproyecto_Final.pdf');

      expect(mockPageService.getAuthors).toHaveBeenCalledWith(draft.proposalData.authors);
      expect(mockPageService.getMemberName).toHaveBeenCalledWith(draft.proposalData.director.id);
    });
  });

  describe('Interacciones y Eventos de Vista (Bindings)', () => {
    beforeEach(() => {
      mockPageService.preliminaryDraftDetails.set(createMockDraft());
      mockPageService.mainDocument.set(createMockDocument());
      fixture.detectChanges();
    });

    it('debería ejecutar goBack() al hacer clic en el botón nativo de Regresar', () => {
      const backButton = fixture.debugElement.query(By.css('button.group'));

      backButton.nativeElement.click();

      expect(mockPageService.goBack).toHaveBeenCalledTimes(1);
    });

    it('debería ejecutar navigateToEvaluations() al emitir onClick en el botón de Evaluaciones', () => {
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));

      buttons[0].componentInstance.onClick.emit();

      expect(mockPageService.navigateToEvaluations).toHaveBeenCalledTimes(1);
    });

    it('debería ejecutar navigateToDocuments() al emitir onClick en el botón de Documentos', () => {
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));

      buttons[1].componentInstance.onClick.emit();

      expect(mockPageService.navigateToDocuments).toHaveBeenCalledTimes(1);
    });

    it('debería ejecutar downloadDocument() al emitir onClick en el botón de Descargar', () => {
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));

      buttons[2].componentInstance.onClick.emit();

      expect(mockPageService.downloadDocument).toHaveBeenCalledTimes(1);
    });
  });
});
