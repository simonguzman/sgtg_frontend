import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RegisterSustentationPageComponent } from './register-sustentation-page.component';
import { RegisterSustentationFacadeService } from './services/register-sustentation-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationFormPayload } from '../../components/register-sustentation-form/register-sustentation-form.component';
import { RegisterSustentationFormComponent } from '../../components/register-sustentation-form/register-sustentation-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// Stubs para aislar la prueba unitaria (Evita renderizar hijos complejos)
@Component({ selector: 'app-register-sustentation-form', template: '', standalone: true })
class MockRegisterSustentationFormComponent {
  @Input() thesisWork!: ThesisWork;
  @Input() isSubmitting!: boolean;
  @Output() onSave = new EventEmitter();
  @Output() onBack = new EventEmitter();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onClose = new EventEmitter();
  @Output() confirm = new EventEmitter();
}

describe('RegisterSustentationPageComponent', () => {
  let component: RegisterSustentationPageComponent;
  let fixture: ComponentFixture<RegisterSustentationPageComponent>;

  // Tipado parcial para mantener la seguridad estricta de TypeScript
  let facadeMock: jest.Mocked<Partial<RegisterSustentationFacadeService>>;
  let routerMock: jest.Mocked<Partial<Router>>;

  // Tipado estructural exacto para eliminar el 'any'
  let routeMock: {
    snapshot: { paramMap: { get: jest.Mock } };
    parent: { snapshot: { paramMap: { get: jest.Mock } } } | null;
  };

  beforeEach(async () => {
    facadeMock = {
      loadThesisWork: jest.fn(),
      processSustentation: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    // Estructura limpia y sin 'any' que simula un ActivatedRoute anidado
    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('thesis-123') } },
      parent: {
        snapshot: { paramMap: { get: jest.fn() } }
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterSustentationPageComponent],
      providers: [
        { provide: RegisterSustentationFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(RegisterSustentationPageComponent, {
      remove: { imports: [
        RegisterSustentationFormComponent,
        ConfirmationActionModalComponent
      ] },
      add: { imports: [
        MockRegisterSustentationFormComponent,
        MockConfirmationActionModalComponent
      ] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSustentationPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Previene contaminación de mocks entre los bloques 'it'
    jest.clearAllMocks();
  });

  describe('ngOnInit y Enrutamiento', () => {
    it('debería buscar el ID en la ruta actual o padres e invocar loadThesisWork', () => {
      fixture.detectChanges(); // Dispara ngOnInit

      expect(routeMock.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería retornar atrás (goBack) si no encuentra ningún ID', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent = null;

      const goBackSpy = jest.spyOn(component, 'goBack');
      fixture.detectChanges();

      expect(goBackSpy).toHaveBeenCalled();
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería navegar a loaded_documents al llamar a goBack', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });

  describe('Acciones de Usuario', () => {
    it('handleRequestConfirmation debería actualizar pendientes y abrir modal', () => {
      const mockData = { payload: {} as SustentationFormPayload, file: new File([''], 'test.pdf') };
      component.handleRequestConfirmation(mockData);

      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });
  });

  describe('processSustentacion', () => {
    it('debería detenerse temprano si no hay datos pendientes o thesisId', () => {
      component.pendingData.set(null);
      component.processSustentacion();

      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.processSustentation).not.toHaveBeenCalled();
    });

    it('debería invocar al facade para procesar, mostrar loader y ocultar modal', () => {
      const mockPayload = {} as SustentationFormPayload;
      const mockFile = new File([''], 'f.pdf');

      component.thesisWorkState.set({ thesisWorkId: 'thesis-123' } as ThesisWork);
      component.pendingData.set({ payload: mockPayload, file: mockFile });

      component.processSustentacion();

      expect(component.isSubmitting()).toBe(true);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processSustentation).toHaveBeenCalledWith(
        'thesis-123',
        mockPayload,
        mockFile,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('callbacks del facade deberían reiniciar isSubmitting y navegar atrás (éxito)', () => {
      component.thesisWorkState.set({ thesisWorkId: 'thesis-123' } as ThesisWork);
      component.pendingData.set({ payload: {} as SustentationFormPayload, file: new File([''], '') });

      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos la ejecución del callback onSuccess
      (facadeMock.processSustentation as jest.Mock).mockImplementation((id, p, f, onSuccess, onError) => {
        onSuccess();
      });

      component.processSustentacion();

      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('callbacks del facade deberían reiniciar isSubmitting y no navegar atrás (error)', () => {
      component.thesisWorkState.set({ thesisWorkId: 'thesis-123' } as ThesisWork);
      component.pendingData.set({ payload: {} as SustentationFormPayload, file: new File([''], '') });

      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos la ejecución del callback onError
      (facadeMock.processSustentation as jest.Mock).mockImplementation((id, p, f, onSuccess, onError) => {
        onError();
      });

      component.processSustentacion();

      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });
});
