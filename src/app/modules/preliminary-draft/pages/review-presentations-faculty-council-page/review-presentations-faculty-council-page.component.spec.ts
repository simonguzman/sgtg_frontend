import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewPresentationsFacultyCouncilPageComponent } from './review-presentations-faculty-council-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal, Component, Input, Output, EventEmitter } from '@angular/core';

// Interfaces y Modelos
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Document } from '../../../../core/interfaces/file-document.interface';

// Componentes Reales para referencia en override
import { ReviewPresentationsFacultyCouncilFormComponent } from "../../components/review-presentations-faculty-council-form/review-presentations-faculty-council-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

// Servicios
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';

// Mock del componente de formulario hijo
@Component({
  selector: 'app-review-presentations-faculty-council-form',
  template: '',
  standalone: true
})
class MockCouncilForm {
  @Input() filteredPreliminaryDraft: any;
  @Output() onSubmit = new EventEmitter<any>();
}

describe('ReviewPresentationsFacultyCouncilPageComponent', () => {
  let component: ReviewPresentationsFacultyCouncilPageComponent;
  let fixture: ComponentFixture<ReviewPresentationsFacultyCouncilPageComponent>;

  // Mocks de servicios
  let preliminaryDraftServiceMock: any;
  let authServiceMock: any;
  let userServiceMock: any;
  let notificationServiceMock: any;
  let downloadServiceMock: any;
  let routerMock: any;

  const mockDraftData: any = {
    preliminaryDraftId: 'draft-123',
    documents: [
      { id: 'doc-old', type: 'Anteproyecto', uploadDate: '2026-01-01', name: 'v1.pdf' },
      { id: 'doc-new', type: 'Correccion', uploadDate: '2026-02-01', name: 'v2.pdf' },
      { id: 'doc-format', type: 'Formato', uploadDate: '2026-02-01', name: 'formato.pdf', url: 'url-f' },
      { id: 'doc-extra', type: 'Anexos', uploadDate: '2026-02-01', name: 'anexo.pdf' }
    ],
    evaluations: [
      { documentId: 'doc-new', signedDocuments: ['eval-doc.pdf'] }
    ]
  };

  beforeEach(async () => {
    preliminaryDraftServiceMock = {
      getPreliminaryDraftByIdMock: jest.fn().mockReturnValue(of(mockDraftData)),
      uploadCouncilResolutionMock: jest.fn().mockReturnValue(of({}))
    };

    authServiceMock = {
      currentUser: signal({ id: 'user-id' })
    };

    userServiceMock = {
      getUserFullName: jest.fn().mockReturnValue('Dr. Decano')
    };

    notificationServiceMock = { show: jest.fn() };
    downloadServiceMock = { download: jest.fn() };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ReviewPresentationsFacultyCouncilPageComponent],
      providers: [
        { provide: PreliminaryDraftService, useValue: preliminaryDraftServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FileDownloadService, useValue: downloadServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'draft-123' } },
            routeConfig: { path: 'review' }
          }
        }
      ]
    })
    .overrideComponent(ReviewPresentationsFacultyCouncilPageComponent, {
      remove: {
        imports: [
          ReviewPresentationsFacultyCouncilFormComponent,
          ConfirmationActionModalComponent
        ]
      },
      add: { imports: [MockCouncilForm] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPresentationsFacultyCouncilPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería inicializar y cargar el anteproyecto correctamente', () => {
    expect(component.preliminaryDraft()).toEqual(mockDraftData);
    expect(preliminaryDraftServiceMock.getPreliminaryDraftByIdMock).toHaveBeenCalledWith('draft-123');
  });

  describe('Lógica de Filtrado (Computed)', () => {
    it('debería filtrar solo los documentos pertinentes para el consejo', () => {
      const filtered = component.filteredPreliminaryDraft();

      const docIds = filtered?.documents.map((d: any) => d.id);

      // Debe incluir la última revisión (doc-new)
      expect(docIds).toContain('doc-new');
      // Debe incluir documentos de referencia permanente
      expect(docIds).toContain('doc-format');
      expect(docIds).toContain('doc-extra');
      // NO debe incluir revisiones antiguas si no son la última
      expect(docIds).not.toContain('doc-old');
    });

    it('debería filtrar evaluaciones que no correspondan a la iteración actual', () => {
      const filtered = component.filteredPreliminaryDraft();
      expect(filtered?.evaluations.length).toBe(1);
      expect(filtered?.evaluations[0].documentId).toBe('doc-new');
    });
  });

  describe('Procesamiento de Decisión del Consejo', () => {
    it('debería procesar la aprobación y navegar hacia atrás', () => {
      const mockPending = {
        formValues: { result: 'Aprobado', comments: 'Aprobado por el consejo' },
        file: new File([], 'resolucion.pdf')
      };
      component.pendingData.set(mockPending);

      component.processCouncilDecision();

      expect(preliminaryDraftServiceMock.uploadCouncilResolutionMock).toHaveBeenCalledWith(
        'draft-123',
        expect.objectContaining({ type: 'Resolucion', status: stateList.APROBADO }),
        stateList.APROBADO,
        expect.objectContaining({ evaluatorRole: 'Consejo de facultad' })
      );

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CONFIRMATION
      }));
      expect(routerMock.navigate).toHaveBeenCalledWith(['../../'], expect.anything());
    });

    it('debería manejar errores del servidor al guardar la decisión', () => {
      preliminaryDraftServiceMock.uploadCouncilResolutionMock.mockReturnValue(throwError(() => new Error()));
      component.pendingData.set({
        formValues: { result: 'Rechazado' },
        file: new File([], 'r.pdf')
      });

      component.processCouncilDecision();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error al guardar'
      }));
    });
  });

  describe('Acciones de UI', () => {
    it('debería llamar al servicio de descarga si el documento tiene URL', () => {
      const doc: Document = { id: '1', name: 'test.pdf', url: 'http://test.com', type: 'Formato', uploadDate: '', status: stateList.APROBADO };
      component.downloadFile(doc);
      expect(downloadServiceMock.download).toHaveBeenCalledWith('http://test.com', 'test.pdf');
    });

    it('debería mostrar notificación si el documento no tiene URL', () => {
      const doc: Document = { id: '1', name: 'test.pdf', url: '', type: 'Formato', uploadDate: '', status: stateList.APLAZADO };
      component.downloadFile(doc);
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Descarga no disponible'
      }));
    });

    it('debería navegar hacia atrás al llamar a goBack()', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['../../'], expect.anything());
    });
  });
});
