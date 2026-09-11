import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { EvaluationModalComponent } from './evaluation-modal.component';
import { stateList } from '../../../../core/enums/state.enum';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { StateComponent } from '../../state/state.component';
import { ButtonComponent } from '../../button-component/button-component.component';

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-state', standalone: true, template: '' })
class MockStateComponent {
  @Input() state?: stateList;
  @Input() label?: string;
}

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Output() onClick = new EventEmitter<void>();
}

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown', 'as') ─────

const createMockFormattedDocument = (overrides: Partial<FormattedDocument> = {}): FormattedDocument => ({
  name: 'documento-defecto.pdf',
  url: 'http://archivos.com/doc.pdf',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluationModalComponent', () => {
  let component: EvaluationModalComponent;
  let fixture: ComponentFixture<EvaluationModalComponent>;

  // Dataset simulado tipado estrictamente gracias a la fábrica
  const mockDocuments: FormattedDocument[] = [
    createMockFormattedDocument({ name: 'proyecto-final.pdf' }),
    createMockFormattedDocument({ name: 'anexo-rubrica.pdf' })
  ];

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante warnings de PrimeNG en JSDOM
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [EvaluationModalComponent],
      providers: [provideNoopAnimations()]
    })
    .overrideComponent(EvaluationModalComponent, {
      remove: {
        imports: [StateComponent, ButtonComponent]
      },
      add: {
        imports: [MockStateComponent, MockButtonComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Renderizado Básico', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar la información del evaluado y del evaluador cuando el modal está abierto', () => {
      // Uso de la API moderna de Angular
      fixture.componentRef.setInput('name', 'Juan Pérez');
      fixture.componentRef.setInput('role', 'Evaluador Principal');
      fixture.componentRef.setInput('evaluationDate', new Date('2026-05-15T00:00:00'));
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Juan Pérez');
      expect(textContent).toContain('Evaluador Principal');
      expect(textContent).toContain('Información del Evaluador Principal');
    });
  });

  describe('Manejo de Estado y Comentarios', () => {
    it('debería renderizar el componente MockStateComponent cuando existe un estado definido', () => {
      fixture.componentRef.setInput('state', stateList.APROBADO);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const stateDebugElement = fixture.debugElement.query(By.directive(MockStateComponent));
      expect(stateDebugElement).toBeTruthy();

      const stateInstance = stateDebugElement.componentInstance as MockStateComponent;
      expect(stateInstance.state).toBe(stateList.APROBADO);
    });

    it('NO debería renderizar el componente MockStateComponent si state es undefined', () => {
      fixture.componentRef.setInput('state', undefined);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const stateDebugElement = fixture.debugElement.query(By.directive(MockStateComponent));
      expect(stateDebugElement).toBeNull();
    });

    it('debería mostrar los comentarios provistos en la evaluación', () => {
      fixture.componentRef.setInput('comments', 'Excelente cumplimiento de requisitos.');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Excelente cumplimiento de requisitos.');
    });

    it('debería mostrar el mensaje por defecto cuando no existen comentarios registrados', () => {
      fixture.componentRef.setInput('comments', '');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('No hay comentarios registrados');
    });
  });

  describe('Sección de Archivos Adjuntos', () => {
    it('debería listar los documentos adjuntos y renderizar un botón de descarga por cada uno', () => {
      fixture.componentRef.setInput('documents', mockDocuments);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('proyecto-final.pdf');
      expect(textContent).toContain('anexo-rubrica.pdf');

      // Buscar por el Mock del botón
      const buttonElements = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      expect(buttonElements.length).toBe(mockDocuments.length);
    });

    it('debería mostrar un mensaje indicando que no hay archivos cuando el arreglo esté vacío', () => {
      fixture.componentRef.setInput('documents', []);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('No han sido cargados archivos a la evaluación.');
    });
  });

  describe('Emisión de Eventos (Outputs)', () => {
    it('debería emitir onDownloadFile con el documento exacto al presionar el botón de Descargar', () => {
      const spyDownload = jest.spyOn(component.onDownloadFile, 'emit');

      fixture.componentRef.setInput('documents', mockDocuments);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      // Encontrar el botón mock y simular su emisión nativa
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      const firstDownloadButtonInstance = buttons[0].componentInstance as MockButtonComponent;

      firstDownloadButtonInstance.onClick.emit();

      expect(spyDownload).toHaveBeenCalledTimes(1);
      expect(spyDownload).toHaveBeenCalledWith(mockDocuments[0]);
    });

    it('debería emitir onClose al invocar closeModal()', () => {
      const spyClose = jest.spyOn(component.onClose, 'emit');

      component.closeModal();

      expect(spyClose).toHaveBeenCalledTimes(1);
    });
  });
});
