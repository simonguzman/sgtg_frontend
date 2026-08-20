import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { RegisterInformationModalComponent } from './register-information-modal.component';
import { ButtonComponent } from '../../button-component/button-component.component';
import { StateComponent } from '../../state/state.component';
import { stateList } from '../../../../core/enums/state.enum';

describe('RegisterInformationModalComponent', () => {
  let component: RegisterInformationModalComponent;
  let fixture: ComponentFixture<RegisterInformationModalComponent>;

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
    comments: 'Comentarios de prueba'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterInformationModalComponent],
      providers: [provideNoopAnimations()] // Fundamental para pruebas con modales de PrimeNG
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterInformationModalComponent);
    component = fixture.componentInstance;
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
      Object.assign(component, mockData);
      component.isOpen = true; // Forzamos la apertura del modal para renderizar el contenido
    });

    it('debería renderizar la información básica correctamente', () => {
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;

      expect(text).toContain(mockData.modalHeader);
      expect(text).toContain(mockData.subTitle);
      expect(text).toContain(mockData.title);
      expect(text).toContain(mockData.student);
      expect(text).toContain(mockData.director);
      expect(text).toContain(mockData.comments);
    });

    it('debería mostrar el mensaje por defecto si no hay descripción (comments)', () => {
      component.comments = '';
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Sin descripción registrada');
    });

    it('debería mostrar el codirector solo si está definido', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Codirector');

      component.codirector = undefined;
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Codirector');
    });

    it('debería mostrar el asesor solo si está definido', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Asesor');

      component.adviser = undefined;
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Asesor');
    });

    it('debería renderizar el componente StateComponent solo si el estado existe', () => {
      fixture.detectChanges();
      let stateDebugEl = fixture.debugElement.query(By.directive(StateComponent));
      expect(stateDebugEl).toBeTruthy();

      const stateInstance = stateDebugEl.componentInstance as StateComponent;
      expect(stateInstance.state).toBe(stateList.APROBADO);

      component.state = undefined;
      fixture.detectChanges();
      stateDebugEl = fixture.debugElement.query(By.directive(StateComponent));
      expect(stateDebugEl).toBeNull();
    });
  });

  describe('Renderizado del DOM - Sección de Archivos', () => {
    beforeEach(() => {
      component.isOpen = true;
    });

    it('debería mostrar el mensaje de vacío si el arreglo de documentos está vacío o es null', () => {
      component.documents = [];
      fixture.detectChanges();

      let text = fixture.nativeElement.textContent;
      expect(text).toContain('No han sido cargados archivos a la evaluación');

      // Prueba adicional de seguridad (aunque TypeScript lo prevenga, en runtime podría llegar null)
      (component.documents as unknown) = null;
      fixture.detectChanges();

      text = fixture.nativeElement.textContent;
      expect(text).toContain('No han sido cargados archivos a la evaluación');
    });

    it('debería mostrar la lista de documentos mediante ButtonComponent', () => {
      component.documents = ['archivo1.pdf', 'archivo2.pdf'];
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.directive(ButtonComponent));
      expect(buttons.length).toBe(2);
    });

    it('debería invocar la descarga cuando el ButtonComponent emite su evento onClick', () => {
      const spyDownload = jest.spyOn(component, 'downloadFile');
      component.documents = ['documento-importante.pdf'];
      fixture.detectChanges();

      const buttonDebugEl = fixture.debugElement.query(By.directive(ButtonComponent));
      const buttonInstance = buttonDebugEl.componentInstance as ButtonComponent;

      // Simulamos que el componente hijo (botón) fue clickeado
      buttonInstance.onClick.emit();
      fixture.detectChanges();

      expect(spyDownload).toHaveBeenCalledWith('documento-importante.pdf');
    });
  });
});
