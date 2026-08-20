import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { EvaluationsPerformedPageComponent } from './evaluations-performed-page.component';
import { EvaluationsFacadeService } from './services/evaluations-facade.service';
import { NotificationService } from '../../components/notifications/services/notification.service';
import { NotificationType } from '../../components/notifications/models/notification.model';
import { EvaluationTableRow } from './models/evaluations-page.model';
import { FormattedDocument } from '../../../core/interfaces/formatted-document.interface';
import { stateList } from '../../../core/enums/state.enum';

describe('EvaluationsPerformedPageComponent', () => {
  let component: EvaluationsPerformedPageComponent;
  let fixture: ComponentFixture<EvaluationsPerformedPageComponent>;

  // Mocks con tipado estricto (Zero-Any)
  let mockFacade: { getMappedEvaluations: jest.Mock; handleDownload: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockRouter: { navigate: jest.Mock; url: string };

  const mockEvaluationRow: EvaluationTableRow = {
    id: 'eval-1',
    evaluatorId: 'user-1',
    evaluatorName: 'Dra. María',
    evaluatorRole: 'Jurado',
    veredict: stateList.APROBADO,
    observations: 'Excelente trabajo',
    date: new Date(),
    documentTargetName: 'Documento Final.pdf',
    signedDocuments: [],
    allowedActions: ['view_details']
  };

  // Función de configuración para permitir probar diferentes estados de la URL
  async function setupTestBed(routeId: string | null) {
    mockFacade = {
      getMappedEvaluations: jest.fn().mockReturnValue([mockEvaluationRow]),
      handleDownload: jest.fn().mockResolvedValue(undefined)
    };

    mockNotificationService = {
      show: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn(),
      url: '/history/proposal/123'
    };

    // Simulamos paramMap devolviendo el ID solicitado
    const mockParamMap = { get: () => routeId };
    const mockActivatedRoute = {
      paramMap: of(mockParamMap),
      parent: { paramMap: of(mockParamMap) }
    };

    await TestBed.configureTestingModule({
      imports: [EvaluationsPerformedPageComponent],
      providers: [
        { provide: EvaluationsFacadeService, useValue: mockFacade },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute as unknown as ActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationsPerformedPageComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cuando la URL tiene un ID válido', () => {
    beforeEach(async () => {
      await setupTestBed('prop-123');
      fixture.detectChanges(); // Ejecuta ngOnInit y resuelve signals
    });

    it('Debe crear el componente', () => {
      expect(component).toBeTruthy();
    });

    it('Debe obtener las evaluaciones consultando al facade mediante la propiedad computada', () => {
      // Para probar propiedades protected, usamos notación de corchetes
      const evaluations = component['evaluationsWithPermissions']();

      expect(mockFacade.getMappedEvaluations).toHaveBeenCalledWith('prop-123', '/history/proposal/123');
      expect(evaluations.length).toBe(1);
      expect(evaluations[0].evaluatorName).toBe('Dra. María');
    });

    it('Debe abrir el modal al hacer click en view_details', () => {
      component.handleTableAction({ action: 'view_details', row: mockEvaluationRow });

      expect(component.modalState()).toEqual({
        open: true,
        evaluation: mockEvaluationRow
      });
    });

    it('Debe cerrar el modal reseteando el estado', () => {
      component.modalState.set({ open: true, evaluation: mockEvaluationRow });
      component.closeModal();

      expect(component.modalState()).toEqual({
        open: false,
        evaluation: null
      });
    });

    it('Debe delegar la descarga del documento al facade', () => {
      const mockDoc: FormattedDocument = { name: 'archivo.pdf', url: 'http://url.com' };
      component.handleDownload(mockDoc);

      expect(mockFacade.handleDownload).toHaveBeenCalledWith(mockDoc);
    });

    it('Debe navegar hacia atrás relativo a la ruta activa', () => {
      component.goBack();

      const activatedRoute = TestBed.inject(ActivatedRoute);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: activatedRoute });
    });
  });

  describe('Cuando la URL NO tiene un ID (Edge case)', () => {
    beforeEach(async () => {
      await setupTestBed(null); // Simulamos que route.paramMap.get('id') devuelve null
      fixture.detectChanges();
    });

    it('Debe disparar handleError, mostrar notificación y redirigir al home', () => {
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Atención',
        message: 'No se pudo identificar el registro.',
        type: NotificationType.ERROR
      });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('Debe retornar un arreglo vacío en evaluationsWithPermissions', () => {
      const evaluations = component['evaluationsWithPermissions']();

      expect(evaluations).toEqual([]);
      expect(mockFacade.getMappedEvaluations).not.toHaveBeenCalled();
    });
  });
});
