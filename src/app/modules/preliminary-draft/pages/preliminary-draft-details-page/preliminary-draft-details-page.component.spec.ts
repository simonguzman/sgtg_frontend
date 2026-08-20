// 1. Angular Core & Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';

// 2. Core Enums & Interfaces
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

// 3. Shared Modules Enums & Interfaces
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { Modality } from '../../../proposal/enums/modality.enum';

// 4. Component, Service & Models
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { PreliminaryDraftDetailsPageComponent } from './preliminary-draft-details-page.component';
import { PreliminaryDraftDetailsPageService } from './services/preliminary-draft-details-page.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

// Interfaz estricta para el Mock del Servicio
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

  // Mock Objects con Tipado Estricto (Sin usar as unknown)
  const mockUser: User = {
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
    state: UserState.active
  };

  const mockDocument: FileDocument = {
    id: 'doc-1',
    name: 'Documento_Anteproyecto_Final.pdf',
    url: 'http://docs/documento.pdf',
    uploadDate: '12/08/2026',
    type: DocumentType.ANTEPROYECTO
  };

  const mockDraft: PreliminaryDraft = {
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    state: stateList.EN_REVISION,
    createdData: new Date(),
    evaluations: [],
    documents: [mockDocument],
    proposalData: {
      id: 'prop-1',
      title: 'Sistema Inteligente de Gestión',
      description: 'Descripción detallada del sistema',
      modality: Modality.TI,
      authors: [mockUser],
      director: mockUser,
      state: stateList.EN_REVISION,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    }
  };

  beforeEach(async () => {
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
    // Sobrescribimos el proveedor a nivel del decorador del componente
    .overrideComponent(PreliminaryDraftDetailsPageComponent, {
      set: {
        providers: [
          { provide: PreliminaryDraftDetailsPageService, useValue: mockPageService }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftDetailsPageComponent);
    component = fixture.componentInstance;
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
      // Configuramos el estado inicial antes de detectar cambios
      mockPageService.preliminaryDraftDetails.set(mockDraft);
      mockPageService.mainDocument.set(mockDocument);

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;

      // Comprobamos que desaparece el mensaje de carga
      expect(compiled.textContent).not.toContain('Cargando información del anteproyecto...');

      // Comprobamos el binding de textos
      expect(compiled.textContent).toContain('Sistema Inteligente de Gestión');
      expect(compiled.textContent).toContain('Descripción detallada del sistema');
      expect(compiled.textContent).toContain('Documento_Anteproyecto_Final.pdf');

      // Comprobamos que delegó el formato a los métodos del servicio
      expect(mockPageService.getAuthors).toHaveBeenCalledWith(mockDraft.proposalData.authors);
      expect(mockPageService.getMemberName).toHaveBeenCalledWith(mockDraft.proposalData.director.id);
    });
  });

  describe('Interacciones y Eventos de Vista (Bindings)', () => {
    beforeEach(() => {
      // Necesitamos cargar los datos para que el HTML renderice los botones
      mockPageService.preliminaryDraftDetails.set(mockDraft);
      mockPageService.mainDocument.set(mockDocument);
      fixture.detectChanges();
    });

    it('debería ejecutar goBack() al hacer clic en el botón nativo de Regresar', () => {
      // Buscamos el botón de regresar por la etiqueta <button> que encapsula el icono
      const backButton = fixture.debugElement.query(By.css('button.group'));

      backButton.nativeElement.click();

      expect(mockPageService.goBack).toHaveBeenCalledTimes(1);
    });

    it('debería ejecutar navigateToEvaluations() al emitir onClick en el botón de Evaluaciones', () => {
      // Obtenemos todos los app-button-component. El índice 0 es 'Evaluaciones realizadas'
      const buttons = fixture.debugElement.queryAll(By.directive(ButtonComponent));

      buttons[0].triggerEventHandler('onClick', undefined);

      expect(mockPageService.navigateToEvaluations).toHaveBeenCalledTimes(1);
    });

    it('debería ejecutar navigateToDocuments() al emitir onClick en el botón de Documentos', () => {
      // El índice 1 corresponde a 'Documentos cargados'
      const buttons = fixture.debugElement.queryAll(By.directive(ButtonComponent));

      buttons[1].triggerEventHandler('onClick', undefined);

      expect(mockPageService.navigateToDocuments).toHaveBeenCalledTimes(1);
    });

    it('debería ejecutar downloadDocument() al emitir onClick en el botón de Descargar', () => {
      // El índice 2 corresponde a 'Descargar'
      const buttons = fixture.debugElement.queryAll(By.directive(ButtonComponent));

      buttons[2].triggerEventHandler('onClick', undefined);

      expect(mockPageService.downloadDocument).toHaveBeenCalledTimes(1);
    });
  });
});
