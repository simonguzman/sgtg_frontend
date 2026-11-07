import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotificationType } from '../../notifications/models/notification.model';

/**
 * Tamaño máximo de cada archivo, en MB. Es el mismo del backend (`spring.servlet.multipart.max-file-size`,
 * variable SGTG_ARCHIVOS_TAMANO_MAXIMO): el documento más pesado es la monografía, que con unas 200 páginas
 * con tablas, imágenes y gráficos queda por debajo de este límite.
 */
export const TAMANO_MAXIMO_ARCHIVO_MB = 20;
const TAMANO_MAXIMO_ARCHIVO_BYTES = TAMANO_MAXIMO_ARCHIVO_MB * 1024 * 1024;

/** Lo que se le indica al usuario en todas las ventanas de carga */
export const REQUISITOS_ARCHIVO = `Solo se permite un archivo en formato PDF de máximo ${TAMANO_MAXIMO_ARCHIVO_MB} MB.`;

@Component({
  selector: 'app-file-upload-modal',
  imports: [DialogModule],
  templateUrl: './file-upload-modal.component.html',
  styleUrls: ['./file-upload-modal.component.css']
})
export class FileUploadModalComponent {
  private readonly notificationService = inject(NotificationService);

  /**
   * Si la ventana está abierta. El p-dialog se crea la primera vez que se abre ({@link yaSeAbrio}): las
   * páginas tienen varias ventanas que casi nunca se abren y crearlas todas al cargar hacía más lenta la página.
   */
  @Input() set isOpen(valor: boolean) {
    this._isOpen = valor;
    if (valor) this.yaSeAbrio = true;
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _isOpen = false;
  /** Se abrió al menos una vez: desde entonces el p-dialog existe (y se conserva para la animación de cierre). */
  yaSeAbrio = false;
  @Input() description = '';
  @Input() uploadedBy = '';
  protected readonly requisitos = REQUISITOS_ARCHIVO;

  @Output() onFileUploaded = new EventEmitter<{ fileName: string, file: File }>();
  @Output() onClose = new EventEmitter<void>();

  @ViewChild('fileInput') private readonly fileInputRef?: ElementRef<HTMLInputElement>;

  uploadedFile: File | null = null;

  /** Los documentos del sistema son siempre PDF: el backend rechaza cualquier otro formato */
  readonly acceptAttribute = '.pdf,application/pdf';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const error = !file.name.toLowerCase().endsWith('.pdf')
        ? 'Solo se permiten archivos en formato PDF.'
        : file.size > TAMANO_MAXIMO_ARCHIVO_BYTES
          ? `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB y el máximo permitido es de `
            + `${TAMANO_MAXIMO_ARCHIVO_MB} MB. Reduzca su tamaño (por ejemplo, comprimiendo las imágenes al exportar el PDF).`
          : null;
      if (error) {
        this.notificationService.show({ title: 'Archivo no válido', message: error, type: NotificationType.ERROR });
        input.value = '';
        return;
      }
      this.uploadedFile = file;
      this.onFileUploaded.emit({
        fileName: this.uploadedFile.name,
        file: this.uploadedFile
      });
    }
  }

  removeFile(): void {
    this.uploadedFile = null;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  closeModal(): void {
    this.removeFile();
    this.onClose.emit();
  }
}
