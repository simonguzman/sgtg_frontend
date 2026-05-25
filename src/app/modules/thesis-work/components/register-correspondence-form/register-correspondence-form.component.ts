import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UserService } from '../../../users/services/user.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { DatePipe } from '@angular/common';
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-register-correspondence-form',
  templateUrl: './register-correspondence-form.component.html',
  styleUrls: ['./register-correspondence-form.component.css'],
  imports: [ButtonComponent, DatePipe]
})
export class RegisterCorrespondenceFormComponent {
  private readonly userService = inject(UserService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  // --- Inputs & Outputs Reactivos ---
  thesisWork = input.required<ThesisWork>();
  isSubmitting = input<boolean>(false);

  onSave = output<File>();
  onGoBack = output<void>(); // 🚀 Añadido para el botón superior "Regresar"

  // Estado local para el archivo H
  selectedFile = signal<{ fileName: string, file: File } | null>(null);

  // --- Computados para Filtrar los Formatos Previos ---
  historicalDocuments = computed(() => this.thesisWork().documents || []);

  formatoEDoc = computed(() => this.historicalDocuments().find(doc => doc.type === DocumentType['FORMATO_E'] || doc.type === 'Formato_E' as any));
  formatoFDoc = computed(() => this.historicalDocuments().find(doc => doc.type === DocumentType['PAZ_Y_SALVO'] || doc.type === 'Formato F' as any));
  formatoGDoc = computed(() => this.historicalDocuments().find(doc => doc.type === DocumentType['FORMATO_G'] || doc.type === 'Formato_G' as any));

  // --- Funciones Limpias para la Plantilla (Evita encadenamientos largos en el HTML) ---
  getStudentNames(): string {
    const authors = this.thesisWork().preliminaryDraftData?.proposalData?.authors;
    return authors ? this.userService.getAuthorsNames(authors) : 'Sin estudiantes asignados';
  }

  getDirectorName(): string {
    const directorId = this.thesisWork().preliminaryDraftData?.proposalData?.director?.id;
    return this.getMemberName(directorId);
  }

  getCodirectorName(): string | null {
    const codirectorId = this.thesisWork().preliminaryDraftData?.proposalData?.codirector?.id;
    return codirectorId ? this.getMemberName(codirectorId) : null;
  }

  getAdvisorName(): string | null {
    const advisorId = this.thesisWork().preliminaryDraftData?.proposalData?.advisor?.id;
    return advisorId ? this.getMemberName(advisorId) : null;
  }

  getMemberName(userId: string | undefined): string {
    return userId ? this.userService.getUserFullName(userId) : 'No asignado';
  }

  // --- Lógica de Descarga ---
  downloadDocument(doc: Document | undefined | null): void {
    if (!doc?.url) {
      this.notificationService.show({
        title: 'Archivo no disponible',
        message: 'El documento solicitado no cuenta con una URL válida.',
        type: NotificationType.ERROR
      });
      return;
    }
    this.downloadService.download(doc.url, doc.name);
  }

  // --- Lógica del File Input (Formato H) ---
  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];

      if (file.type !== 'application/pdf') {
        this.notificationService.show({
          title: 'Formato inválido',
          message: 'Solo se permiten archivos en formato PDF.',
          type: NotificationType.ERROR
        });
        return;
      }
      this.selectedFile.set({ fileName: file.name, file: file });
    }
  }

  triggerFileInput(): void {
    document.getElementById('correspondenceFileInput')?.click();
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    // 🚀 Limpiamos el valor del input file nativo para que permita volver a seleccionar el mismo archivo si es necesario
    const inputElement = document.getElementById('correspondenceFileInput') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = '';
    }
  }

  submitForm(): void {
    const fileData = this.selectedFile();
    if (fileData) {
      this.onSave.emit(fileData.file);
    }
  }
}
