import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreliminaryDraftDetailsPageComponent } from './preliminary-draft-details-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal, Component, Input } from '@angular/core';

// Componentes Reales (Necesarios para el override)
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";

// Interfaces y Modelos
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

// Servicios
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';

// Mock del componente de botón
@Component({
  selector: 'app-button-component',
  template: '',
  standalone: true
})
class MockButton {
  @Input() label: string = '';
  @Input() variant: string = 'primary';
  @Input() disabled: boolean = false;
}

describe('PreliminaryDraftDetailsPageComponent', () => {
  let component: PreliminaryDraftDetailsPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftDetailsPageComponent>;

  // Mocks de dependencias
  let preliminaryDraftServiceMock: any;
  let userServiceMock: any;
  let notificationServiceMock: any;
  let downloadServiceMock: any;
  let routerMock: any;

  const mockDraftData: any = {
    preliminaryDraftId: '123',
    proposalData: {
      title: 'Sistema de Gestión de Anteproyectos',
      director: { id: 'dir-1' },
      authors: ['student-1', 'student-2']
    },
    documents: [
      { id: 'doc-1', type: 'Anexos', name: 'anexo.pdf', url: 'url-anexo' },
      { id: 'doc-2', type: 'Anteproyecto', name: 'principal.pdf', url: 'url-principal' }
    ]
  };

  beforeEach(async () => {
    preliminaryDraftServiceMock = {
      getPreliminaryDraftByIdMock: jest.fn().mockReturnValue(of(mockDraftData))
    };

    userServiceMock = {
      getUserFullName: jest.fn().mockReturnValue('Nombre del Director'),
      getAuthorsNames: jest.fn().mockReturnValue('Autor A, Autor B')
    };

    notificationServiceMock = { show: jest.fn() };
    downloadServiceMock = { download: jest.fn() };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftDetailsPageComponent],
      providers: [
        { provide: PreliminaryDraftService, useValue: preliminaryDraftServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FileDownloadService, useValue: downloadServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '123' } }
          }
        }
      ]
    })
    .overrideComponent(PreliminaryDraftDetailsPageComponent, {
      // SOLUCIÓN: Usamos la clase real 'ButtonComponent', no 'any'
      remove: { imports: [ButtonComponent] },
      add: { imports: [MockButton] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftDetailsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería inicializar correctamente y cargar los detalles', () => {
    expect(component).toBeTruthy();
    expect(preliminaryDraftServiceMock.getPreliminaryDraftByIdMock).toHaveBeenCalledWith('123');
    expect(component.preliminayDraftDetails()).toEqual(mockDraftData);
  });

  describe('Lógica del Computed (mainDocument)', () => {
    it('debería identificar el documento de tipo "Anteproyecto" como el principal', () => {
      const doc = component.mainDocument();
      expect(doc?.name).toBe('principal.pdf');
      expect(doc?.type).toBe('Anteproyecto');
    });

    it('debería seleccionar el primer documento si no existe uno de tipo "Anteproyecto"', () => {
      component.preliminayDraftDetails.set({
        ...mockDraftData,
        documents: [{ id: '99', type: 'Otro', name: 'solo_uno.pdf', url: 'url' }]
      });
      const doc = component.mainDocument();
      expect(doc?.id).toBe('99');
    });
  });

  describe('Descarga de Archivos', () => {
    it('debería ejecutar el flujo de descarga completo con éxito', () => {
      component.downloadDocument();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.INFO
      }));
      expect(downloadServiceMock.download).toHaveBeenCalledWith('url-principal', 'principal.pdf');
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CONFIRMATION
      }));
    });

    it('debería mostrar error si el documento no tiene una URL válida', () => {
      component.preliminayDraftDetails.set({
        ...mockDraftData,
        documents: [{ id: '1', type: 'Anteproyecto', name: 'error.pdf', url: '' }]
      });

      component.downloadDocument();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Archivo no disponible'
      }));
      expect(downloadServiceMock.download).not.toHaveBeenCalled();
    });
  });

  describe('Integración con UserService', () => {
    it('debería retornar el nombre formateado del director', () => {
      const name = component.getMemberName('dir-1');
      expect(userServiceMock.getUserFullName).toHaveBeenCalledWith('dir-1');
      expect(name).toBe('Nombre del Director');
    });

    it('debería retornar los nombres de los autores unidos por coma', () => {
      const authors = component.getAuthors(['s1', 's2']);
      expect(userServiceMock.getAuthorsNames).toHaveBeenCalledWith(['s1', 's2']);
      expect(authors).toBe('Autor A, Autor B');
    });
  });
});
