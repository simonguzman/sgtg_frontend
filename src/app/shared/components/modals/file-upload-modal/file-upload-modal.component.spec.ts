import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FileUploadModalComponent, REQUISITOS_ARCHIVO, TAMANO_MAXIMO_ARCHIVO_MB } from './file-upload-modal.component';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotificationType } from '../../notifications/models/notification.model';

describe('FileUploadModalComponent', () => {
  let component: FileUploadModalComponent;
  let fixture: ComponentFixture<FileUploadModalComponent>;
  let notificationServiceMock: { show: jest.Mock };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    notificationServiceMock = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [FileUploadModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadModalComponent);
    component = fixture.componentInstance;
  });

  describe('Inicialización y Renderizado', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería mostrar la descripción inicial cuando no se ha cargado un archivo', () => {
      fixture.componentRef.setInput('description', 'Sube tu archivo PDF de tesis');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Sube tu archivo PDF de tesis');
      expect(text).toContain('Sus datos personales y archivos están protegidos');
    });

    it('siempre indica que solo se acepta un PDF y su tamaño máximo', () => {
      fixture.componentRef.setInput('description', 'Subir el informe mensual de avance');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      expect(REQUISITOS_ARCHIVO).toBe('Solo se permite un archivo en formato PDF de máximo 20 MB.');
      expect(fixture.nativeElement.textContent).toContain(REQUISITOS_ARCHIVO);
      expect(component.acceptAttribute).toBe('.pdf,application/pdf');
    });

    it('debería mostrar la información del archivo y el usuario cuando el archivo existe', () => {
      const mockFile = new File(['contenido'], 'documento-tesis.pdf', { type: 'application/pdf' });
      fixture.componentRef.setInput('uploadedBy', 'Simón Guzmán');
      fixture.componentRef.setInput('isOpen', true);
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

    it('debería rechazar un archivo que NO sea PDF, lanzar notificación de error y limpiar el input', () => {
      const spyEmit = jest.spyOn(component.onFileUploaded, 'emit');
      const invalidFile = new File(['contenido'], 'imagen.png', { type: 'image/png' });
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      Object.defineProperty(inputElement, 'files', { value: [invalidFile] });
      const mockEvent = new Event('change');
      Object.defineProperty(mockEvent, 'target', { writable: false, value: inputElement });
      component.onFileSelected(mockEvent);
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Archivo no válido',
        message: 'Solo se permiten archivos en formato PDF.',
        type: NotificationType.ERROR
      });
      expect(inputElement.value).toBe('');
      expect(component.uploadedFile).toBeNull();
      expect(spyEmit).not.toHaveBeenCalled();
    });

    const seleccionar = (archivo: File) => {
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      Object.defineProperty(inputElement, 'files', { value: [archivo] });
      const evento = new Event('change');
      Object.defineProperty(evento, 'target', { writable: false, value: inputElement });
      component.onFileSelected(evento);
      return inputElement;
    };

    it('rechaza un PDF de más de 20 MB e indica su tamaño y el máximo', () => {
      const spyEmit = jest.spyOn(component.onFileUploaded, 'emit');
      const grande = new File(['%PDF-'], 'monografia.pdf', { type: 'application/pdf' });
      Object.defineProperty(grande, 'size', { value: (TAMANO_MAXIMO_ARCHIVO_MB + 5) * 1024 * 1024 });
      const input = seleccionar(grande);
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Archivo no válido',
        message: expect.stringContaining('pesa 25,0 MB y el máximo permitido es de 20 MB'),
        type: NotificationType.ERROR
      }));
      expect(input.value).toBe('');
      expect(spyEmit).not.toHaveBeenCalled();
    });

    it('acepta un PDF de exactamente 20 MB', () => {
      const spyEmit = jest.spyOn(component.onFileUploaded, 'emit');
      const limite = new File(['%PDF-'], 'monografia.pdf', { type: 'application/pdf' });
      Object.defineProperty(limite, 'size', { value: TAMANO_MAXIMO_ARCHIVO_MB * 1024 * 1024 });
      seleccionar(limite);
      expect(spyEmit).toHaveBeenCalledTimes(1);
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('rechaza un ZIP: los anexos también deben ser PDF', () => {
      seleccionar(new File(['PK'], 'anexos.zip', { type: 'application/zip' }));
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Solo se permiten archivos en formato PDF.'
      }));
      expect(component.uploadedFile).toBeNull();
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
      component.uploadedFile = new File(['contenido'], 'test.pdf', { type: 'application/pdf' });
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const removeButton = fixture.debugElement.query(By.css('button.text-gray-400'));
      expect(removeButton).toBeTruthy();
      removeButton.nativeElement.click();
      expect(spyRemove).toHaveBeenCalledTimes(1);
    });
  });
});
