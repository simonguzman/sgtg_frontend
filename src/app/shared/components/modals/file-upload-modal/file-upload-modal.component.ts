import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotificationType } from '../../notifications/models/notification.model';

type AcceptedFileTypes = 'pdf' | 'pdf-zip';

interface FileTypeConfig {
  accept: string;
  extensions: string[];
  errorMessage: string;
}

const FILE_TYPE_CONFIGS: Record<AcceptedFileTypes, FileTypeConfig> = {
  pdf: {
    accept: '.pdf',
    extensions: ['.pdf'],
    errorMessage: 'Solo se permiten archivos en formato PDF.'
  },
  'pdf-zip': {
    accept: '.pdf,.zip',
    extensions: ['.pdf', '.zip'],
    errorMessage: 'Solo se permiten archivos en formato PDF o ZIP.'
  }
};

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
  @Input() acceptedTypes: AcceptedFileTypes = 'pdf';

  @Output() onFileUploaded = new EventEmitter<{ fileName: string, file: File }>();
  @Output() onClose = new EventEmitter<void>();

  @ViewChild('fileInput') private readonly fileInputRef?: ElementRef<HTMLInputElement>;

  uploadedFile: File | null = null;

  get acceptAttribute(): string {
    return FILE_TYPE_CONFIGS[this.acceptedTypes].accept;
  }

  get uploadedFileIcon(): string {
    return this.uploadedFile?.name.toLowerCase().endsWith('.zip') ? 'folder_zip' : 'picture_as_pdf';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const config = FILE_TYPE_CONFIGS[this.acceptedTypes];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = config.extensions.some(ext => fileName.endsWith(ext));
      if (!hasValidExtension) {
        this.notificationService.show({
          title: 'Archivo no válido',
          message: config.errorMessage,
          type: NotificationType.ERROR
        });
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
