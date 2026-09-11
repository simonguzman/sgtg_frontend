import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { FileUploadModalComponent } from './file-upload-modal.component';

describe('FileUploadModalComponent', () => {
  let component: FileUploadModalComponent;
  let fixture: ComponentFixture<FileUploadModalComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante warnings de p-dialog en JSDOM
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [FileUploadModalComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías (incluyendo el alert)
  });

  describe('Inicialización y Renderizado', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería mostrar la descripción inicial cuando no se ha cargado un archivo', () => {
      // Uso de API moderna para inyectar @Inputs
      fixture.componentRef.setInput('description', 'Sube tu archivo PDF de tesis');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Sube tu archivo PDF de tesis');
      expect(text).toContain('Sus datos personales y archivos están protegidos');
    });

    it('debería mostrar la información del archivo y el usuario cuando el archivo existe', () => {
      const mockFile = new File(['contenido'], 'documento-tesis.pdf', { type: 'application/pdf' });

      fixture.componentRef.setInput('uploadedBy', 'Simón Guzmán');
      fixture.componentRef.setInput('isOpen', true);

      // uploadedFile no es un @Input, es un estado interno
      component.uploadedFile = mockFile;
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('documento-tesis.pdf');
      expect(text).toContain('Subido por: Simón Guzmán');
    });
  });

  describe('Lógica de Selección y Validación de Archivos', () => {
    it('debería aceptar un archivo PDF, actualizar el estado y emitir onFileUploaded', () => {
      const spyEmit = jest.spyOn(component.onFileUploaded, 'emit');

      const file = new File(['contenido'], 'test.pdf', { type: 'application/pdf' });
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      Object.defineProperty(inputElement, 'files', { value: [file] });

      const mockEvent = new Event('change');
      Object.defineProperty(mockEvent, 'target', { writable: false, value: inputElement });

      component.onFileSelected(mockEvent);

      expect(component.uploadedFile).toEqual(file);
      expect(spyEmit).toHaveBeenCalledWith({
        fileName: 'test.pdf',
        file: file
      });
      expect(spyEmit).toHaveBeenCalledTimes(1);
    });

    it('debería rechazar un archivo que NO sea PDF, lanzar alerta y limpiar el input', () => {
      const spyEmit = jest.spyOn(component.onFileUploaded, 'emit');

      // Espiamos window.alert para que la prueba no se detenga ni muestre el popup en consola
      const spyAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const invalidFile = new File(['contenido'], 'imagen.png', { type: 'image/png' });
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      Object.defineProperty(inputElement, 'files', { value: [invalidFile] });

      const mockEvent = new Event('change');
      Object.defineProperty(mockEvent, 'target', { writable: false, value: inputElement });

      component.onFileSelected(mockEvent);

      expect(spyAlert).toHaveBeenCalledWith('Solo se permiten archivos en formato PDF');
      expect(inputElement.value).toBe('');
      expect(component.uploadedFile).toBeNull();
      expect(spyEmit).not.toHaveBeenCalled();
    });
  });

  describe('Acciones del Modal (Limpiar y Cerrar)', () => {
    it('debería limpiar el archivo al llamar a removeFile()', () => {
      component.uploadedFile = new File(['contenido'], 'test.pdf');
      component.removeFile();

      expect(component.uploadedFile).toBeNull();
    });

    it('debería limpiar el archivo y emitir onClose al llamar a closeModal()', () => {
      const spyClose = jest.spyOn(component.onClose, 'emit');
      component.uploadedFile = new File(['contenido'], 'test.pdf');

      component.closeModal();

      expect(component.uploadedFile).toBeNull();
      expect(spyClose).toHaveBeenCalledTimes(1);
    });

    it('debería invocar removeFile() al hacer clic en el botón de eliminar archivo renderizado', () => {
      const spyRemove = jest.spyOn(component, 'removeFile');

      // Seteamos estado y abrimos modal
      component.uploadedFile = new File(['contenido'], 'test.pdf', { type: 'application/pdf' });
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      // Buscamos específicamente el botón con la clase text-gray-400 para ignorar el
      // botón de cerrar ventana que PrimeNG inyecta por defecto en su p-dialog
      const removeButton = fixture.debugElement.query(By.css('button.text-gray-400'));
      expect(removeButton).toBeTruthy();

      // Usamos el nativeElement para simular un clic de usuario real en el DOM
      removeButton.nativeElement.click();

      expect(spyRemove).toHaveBeenCalledTimes(1);
    });
  });
});
