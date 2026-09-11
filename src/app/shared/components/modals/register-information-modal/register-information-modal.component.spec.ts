import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { RegisterInformationModalComponent } from './register-information-modal.component';
import { stateList } from '../../../../core/enums/state.enum';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { ButtonComponent } from '../../button-component/button-component.component';
import { StateComponent } from '../../state/state.component';

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-state', standalone: true, template: '' })
class MockStateComponent {
  @Input() state?: stateList;
  @Input() label?: string;
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterInformationModalComponent', () => {
  let component: RegisterInformationModalComponent;
  let fixture: ComponentFixture<RegisterInformationModalComponent>;

  // Variables base fuertemente tipadas
  const mockData = {
    modalHeader: 'Header Test',
    subTitle: 'Subtitulo Test',
    title: 'Proyecto X',
    modality: 'Investigación',
    student: 'Juan',
    director: 'Dr. Smith',
    codirector: 'Dra. Ana',
    adviser: 'Ing. Pedro',
    state: stateList.APROBADO,
    documents: ['doc1.pdf', 'doc2.pdf'],
    comments: 'Comentarios de prueba',
    chargeDate: new Date('2024-01-01T10:00:00')
  };

  const setupMockData = () => {
    Object.entries(mockData).forEach(([key, value]) => {
      fixture.componentRef.setInput(key, value);
    });
    fixture.componentRef.setInput('isOpen', true); // Forzamos la apertura del modal
    fixture.detectChanges();
  };

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante warnings de modales de PrimeNG en JSDOM
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [RegisterInformationModalComponent],
      providers: [provideNoopAnimations()] // Fundamental para pruebas con modales de PrimeNG sin romper asincronía
    })
    .overrideComponent(RegisterInformationModalComponent, {
      remove: {
        imports: [ButtonComponent, StateComponent]
      },
      add: {
        imports: [MockButtonComponent, MockStateComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterInformationModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Lógica de Eventos', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería emitir onClose al llamar a closeModal()', () => {
      const spyClose = jest.spyOn(component.onClose, 'emit');
      component.closeModal();
      expect(spyClose).toHaveBeenCalledTimes(1);
    });

    it('debería emitir onDownloadFile con el nombre del archivo al llamar a downloadFile()', () => {
      const spyDownload = jest.spyOn(component.onDownloadFile, 'emit');
      const fileName = 'archivo-tesis.pdf';

      component.downloadFile(fileName);

      expect(spyDownload).toHaveBeenCalledWith(fileName);
      expect(spyDownload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Renderizado del DOM - Información Principal', () => {
    beforeEach(() => {
      setupMockData();
    });

    it('debería renderizar la información básica correctamente', () => {
      const text = fixture.nativeElement.textContent;

      expect(text).toContain(mockData.modalHeader);
      expect(text).toContain(mockData.subTitle);
      expect(text).toContain(mockData.title);
      expect(text).toContain(mockData.student);
      expect(text).toContain(mockData.director);
      expect(text).toContain(mockData.comments);
    });

    it('debería mostrar el mensaje por defecto si no hay descripción (comments)', () => {
      fixture.componentRef.setInput('comments', '');
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Sin descripción registrada');
    });

    it('debería mostrar el codirector solo si está definido', () => {
      expect(fixture.nativeElement.textContent).toContain('Codirector');

      // API de Angular estricta para undefined
      fixture.componentRef.setInput('codirector', undefined);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Codirector');
    });

    it('debería mostrar el asesor solo si está definido', () => {
      expect(fixture.nativeElement.textContent).toContain('Asesor');

      fixture.componentRef.setInput('adviser', undefined);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Asesor');
    });

    it('debería renderizar el componente StateComponent solo si el estado existe', () => {
      let stateDebugEl = fixture.debugElement.query(By.directive(MockStateComponent));
      expect(stateDebugEl).toBeTruthy();

      const stateInstance = stateDebugEl.componentInstance as MockStateComponent;
      expect(stateInstance.state).toBe(stateList.APROBADO);

      fixture.componentRef.setInput('state', undefined);
      fixture.detectChanges();

      stateDebugEl = fixture.debugElement.query(By.directive(MockStateComponent));
      expect(stateDebugEl).toBeNull();
    });
  });

  describe('Renderizado del DOM - Sección de Archivos', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
    });

    it('debería mostrar el mensaje de vacío si el arreglo de documentos está vacío', () => {
      fixture.componentRef.setInput('documents', []);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No han sido cargados archivos a la evaluación');
    });

    it('debería mostrar la lista de documentos mediante ButtonComponent', () => {
      fixture.componentRef.setInput('documents', ['archivo1.pdf', 'archivo2.pdf']);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      expect(buttons.length).toBe(2);
    });

    it('debería invocar la descarga cuando el ButtonComponent emite su evento onClick', () => {
      const spyDownload = jest.spyOn(component, 'downloadFile');

      fixture.componentRef.setInput('documents', ['documento-importante.pdf']);
      fixture.detectChanges();

      const buttonDebugEl = fixture.debugElement.query(By.directive(MockButtonComponent));
      const buttonInstance = buttonDebugEl.componentInstance as MockButtonComponent;

      // Simulamos que el componente hijo simulado emite su evento
      buttonInstance.onClick.emit();
      fixture.detectChanges();

      expect(spyDownload).toHaveBeenCalledWith('documento-importante.pdf');
    });
  });
});
