import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { EvaluationModalComponent } from './evaluation-modal.component';
import { StateComponent } from '../../state/state.component';
import { ButtonComponent } from '../../button-component/button-component.component';
import { stateList } from '../../../../core/enums/state.enum';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';

describe('EvaluationModalComponent', () => {
  let component: EvaluationModalComponent;
  let fixture: ComponentFixture<EvaluationModalComponent>;

  // Dataset simulado con tipado estricto (FormattedDocument[])
  const mockDocuments: FormattedDocument[] = [
    { name: 'proyecto-final.pdf' } as FormattedDocument,
    { name: 'anexo-rubrica.pdf' } as FormattedDocument
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationModalComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización y Renderizado Básico', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar la información del evaluado y del evaluador cuando el modal está abierto', () => {
      component.name = 'Juan Pérez';
      component.role = 'Evaluador Principal';
      component.evaluationDate = new Date('2026-05-15T00:00:00');
      component.isOpen = true;
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Juan Pérez');
      expect(textContent).toContain('Evaluador Principal');
      expect(textContent).toContain('Información del Evaluador Principal');
    });
  });

  describe('Manejo de Estado y Comentarios', () => {
    it('debería renderizar el componente StateComponent cuando existe un estado definido', () => {
      component.state = stateList.APROBADO;
      component.isOpen = true;
      fixture.detectChanges();

      const stateDebugElement = fixture.debugElement.query(By.directive(StateComponent));
      expect(stateDebugElement).toBeTruthy();
      expect(stateDebugElement.componentInstance.state).toBe(stateList.APROBADO);
    });

    it('NO debería renderizar el componente StateComponent si state es undefined', () => {
      component.state = undefined;
      component.isOpen = true;
      fixture.detectChanges();

      const stateDebugElement = fixture.debugElement.query(By.directive(StateComponent));
      expect(stateDebugElement).toBeNull();
    });

    it('debería mostrar los comentarios provistos en la evaluación', () => {
      component.comments = 'Excelente cumplimiento de requisitos.';
      component.isOpen = true;
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Excelente cumplimiento de requisitos.');
    });

    it('debería mostrar el mensaje por defecto cuando no existen comentarios registrados', () => {
      component.comments = '';
      component.isOpen = true;
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('No hay comentarios registrados');
    });
  });

  describe('Sección de Archivos Adjuntos', () => {
    it('debería listar los documentos adjuntos y renderizar un botón de descarga por cada uno', () => {
      component.documents = mockDocuments;
      component.isOpen = true;
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('proyecto-final.pdf');
      expect(textContent).toContain('anexo-rubrica.pdf');

      const buttonElements = fixture.debugElement.queryAll(By.directive(ButtonComponent));
      expect(buttonElements.length).toBe(mockDocuments.length);
    });

    it('debería mostrar un mensaje indicando que no hay archivos cuando el arreglo esté vacío', () => {
      component.documents = [];
      component.isOpen = true;
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('No han sido cargados archivos a la evaluación.');
    });
  });

  describe('Emisión de Eventos (Outputs)', () => {
    it('debería emitir onDownloadFile con el documento exacto al presionar el botón de Descargar', () => {
      const spyDownload = jest.spyOn(component.onDownloadFile, 'emit');
      component.documents = mockDocuments;
      component.isOpen = true;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.directive(ButtonComponent));
      const firstDownloadButton = buttons[0];
      expect(firstDownloadButton).toBeTruthy();

      firstDownloadButton.triggerEventHandler('onClick', null);

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
