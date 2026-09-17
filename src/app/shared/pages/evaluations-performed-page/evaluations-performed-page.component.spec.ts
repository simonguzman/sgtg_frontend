import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { of } from 'rxjs';

import { EvaluationsPerformedPageComponent } from './evaluations-performed-page.component';
import { EvaluationsFacadeService } from './services/evaluations-facade.service';
import { NotificationService } from '../../components/notifications/services/notification.service';
import { NotificationType } from '../../components/notifications/models/notification.model';
import { EvaluationTableRow, EVALUATIONS_COLUMNS } from './models/evaluations-page.model';
import { FormattedDocument } from '../../../core/interfaces/formatted-document.interface';
import { stateList } from '../../../core/enums/state.enum';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { TableComponent } from '../../components/table-component/table-component.component';
import { EvaluationModalComponent } from '../../components/modals/evaluation-modal/evaluation-modal.component';

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() value: EvaluationTableRow[] = [];
  @Input() columns: typeof EVALUATIONS_COLUMNS = [];
  @Input() paginator = false;
  @Input() emptyMessage = '';
  @Output() actionClick = new EventEmitter<{ action: string; row: EvaluationTableRow }>();
}

@Component({ selector: 'app-evaluation-modal', standalone: true, template: '' })
class MockEvaluationModalComponent {
  @Input() isOpen = false;
  @Input() name = '';
  @Input() role = '';
  @Input() evaluationDate!: Date;
  @Input() state = '';
  @Input() comments = '';
  @Input() documents: FormattedDocument[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FormattedDocument>();
}

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockEvaluationRow = (overrides: Partial<EvaluationTableRow> = {}): EvaluationTableRow => ({
  id: 'eval-1',
  evaluatorId: 'user-1',
  evaluatorName: 'Dra. María',
  evaluatorRole: 'Jurado',
  veredict: stateList.APROBADO,
  observations: 'Excelente trabajo',
  date: new Date('2024-01-01T10:00:00Z'),
  documentTargetName: 'Documento Final.pdf',
  signedDocuments: [],
  allowedActions: ['view_details'],
  ...overrides
});

const createMockFormattedDocument = (overrides: Partial<FormattedDocument> = {}): FormattedDocument => ({
  name: 'archivo.pdf',
  url: 'http://url.com',
  // FIX: Se eliminó la propiedad 'size' que no existe en la interfaz original
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluationsPerformedPageComponent', () => {
  let component: EvaluationsPerformedPageComponent;
  let fixture: ComponentFixture<EvaluationsPerformedPageComponent>;

  // Tipado estricto de los espías
  let mockFacade: {
    getMappedEvaluations: jest.Mock<EvaluationTableRow[], [string, string]>;
    handleDownload: jest.Mock<Promise<void>, [FormattedDocument]>;
  };

  let mockNotificationService: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>
  };

  let mockRouter: {
    navigate: jest.Mock<Promise<boolean>, [string[], any?]>;
    url: string
  };

  const setupTestBed = async (routeId: string | null) => {
    // 🔕 Silenciar consola para mantener terminal limpia de advertencias y errores simulados
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFacade = {
      getMappedEvaluations: jest.fn().mockReturnValue([createMockEvaluationRow()]),
      handleDownload: jest.fn().mockResolvedValue(undefined)
    };

    mockNotificationService = {
      show: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
      url: '/history/proposal/123'
    };

    // Estructura completa de paramMap para evitar casteos "as unknown as ActivatedRoute"
    const mockParamMap = {
      has: jest.fn(),
      getAll: jest.fn(),
      keys: [],
      get: jest.fn().mockReturnValue(routeId) // Dinámico según el parámetro
    };

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
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .overrideComponent(EvaluationsPerformedPageComponent, {
      remove: {
        imports: [TableComponent, EvaluationModalComponent]
      },
      add: {
        imports: [MockTableComponent, MockEvaluationModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationsPerformedPageComponent);
    component = fixture.componentInstance;
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías
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
      expect(evaluations).toHaveLength(1);
      expect(evaluations[0].evaluatorName).toBe('Dra. María');
    });

    it('Debe abrir el modal al hacer click en view_details', () => {
      const mockRow = createMockEvaluationRow();

      component.handleTableAction({ action: 'view_details', row: mockRow });

      expect(component.modalState()).toEqual({
        open: true,
        evaluation: mockRow
      });
    });

    it('Debe cerrar el modal reseteando el estado', () => {
      const mockRow = createMockEvaluationRow();
      component.modalState.set({ open: true, evaluation: mockRow });

      component.closeModal();

      expect(component.modalState()).toEqual({
        open: false,
        evaluation: null
      });
    });

    it('Debe delegar la descarga del documento al facade', () => {
      const mockDoc = createMockFormattedDocument();

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
