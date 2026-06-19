import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssingEvaluatorsPageComponent } from './assign-evaluators-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal, Component, Input, Output, EventEmitter } from '@angular/core';

// Servicios e Interfaces
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

// IMPORTANTE: Importamos el componente real para poder removerlo en el override
import { AssignEvaluatorsFormComponent } from "../../components/assign-evaluators-form/assign-evaluators-form.component";

// --- MOCK DEL COMPONENTE HIJO ---
@Component({
  selector: 'app-assign-evaluators-form',
  template: '',
  standalone: true
})
class MockAssignForm {
  @Input() preliminaryDraft: PreliminaryDraft | null = null;
  @Input() isLoading = false;
  @Output() assign = new EventEmitter<{ ev1: string; ev2: string }>();
}

describe('AssingEvaluatorsPageComponent', () => {
  let component: AssingEvaluatorsPageComponent;
  let fixture: ComponentFixture<AssingEvaluatorsPageComponent>;

  let preliminaryDraftServiceMock: any;
  let notificationServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

  const mockDraft: PreliminaryDraft = {
    preliminaryDraftId: 'draft-123',
    title: 'Sistema de Gestión de Grados',
    state: 'EN_REVISION',
    evaluators: []
  } as any;

  beforeEach(async () => {
    preliminaryDraftServiceMock = {
      getPreliminaryDraftByIdMock: jest.fn().mockReturnValue(of(mockDraft)),
      assignReviewersMock: jest.fn().mockReturnValue(of({}))
    };

    notificationServiceMock = { show: jest.fn() };
    routerMock = { navigate: jest.fn() };

    activatedRouteMock = {
      snapshot: { paramMap: { get: () => null } },
      parent: {
        snapshot: { paramMap: { get: (key: string) => key === 'id' ? 'draft-123' : null } }
      }
    };

    await TestBed.configureTestingModule({
      // Importamos el componente bajo prueba
      imports: [AssingEvaluatorsPageComponent],
      providers: [
        { provide: PreliminaryDraftService, useValue: preliminaryDraftServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    // CORRECCIÓN CLAVE: Removre el componente real y añadir el mock
    .overrideComponent(AssingEvaluatorsPageComponent, {
      remove: {
        imports: [AssignEvaluatorsFormComponent]
      },
      add: {
        imports: [MockAssignForm]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssingEvaluatorsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse el componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Carga Inicial (ngOnInit)', () => {
    it('debería resolver el ID del anteproyecto desde la ruta padre', () => {
      expect(component.targetPreliminaryDraftId()).toBe('draft-123');
      expect(preliminaryDraftServiceMock.getPreliminaryDraftByIdMock).toHaveBeenCalledWith('draft-123');
    });

    it('debería cargar los datos del anteproyecto exitosamente', () => {
      expect(component.selectedPreliminaryDraft()).toEqual(mockDraft);
      expect(component.isDataLoading()).toBe(false);
    });

    it('debería manejar el error cuando el anteproyecto no existe', () => {
      preliminaryDraftServiceMock.getPreliminaryDraftByIdMock.mockReturnValue(of(null));
      component.ngOnInit();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Anteproyecto no encontrado'
      }));
      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], expect.anything());
    });

    it('debería navegar hacia atrás si no se encuentra ningún ID en la ruta', () => {
      // Forzamos que no haya ID
      (component as any).route.snapshot.paramMap.get = () => null;
      (component as any).route.parent = null;

      component.ngOnInit();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error de navegación'
      }));
      expect(routerMock.navigate).toHaveBeenCalled();
    });
  });

  describe('Acción de Asignación (handleAssign)', () => {
    const mockEvaluators = { ev1: 'user-1', ev2: 'user-2' };

    it('debería llamar al servicio de asignación con los IDs correctos', () => {
      component.handleAssign(mockEvaluators);
      expect(preliminaryDraftServiceMock.assignReviewersMock).toHaveBeenCalledWith(
        'draft-123',
        ['user-1', 'user-2']
      );
    });

    it('debería mostrar notificación de éxito y navegar atrás al terminar', () => {
      component.handleAssign(mockEvaluators);
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CONFIRMATION
      }));
      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], expect.anything());
    });
  });

  it('debería navegar una posición atrás al llamar a goBack', () => {
    component.goBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['../'], { relativeTo: activatedRouteMock });
  });
});
