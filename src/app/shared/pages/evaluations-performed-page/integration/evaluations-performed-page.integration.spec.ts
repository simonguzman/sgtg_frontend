// src/app/shared/pages/evaluations-performed-page/integration/evaluations-performed-page.integration.spec.ts
import 'fake-indexeddb/auto';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations'; // <-- IMPORTANTE: Importamos NoopAnimations

// ── Componentes y Servicios REALES a integrar ──────────────────────────────
import { EvaluationsPerformedPageComponent } from '../evaluations-performed-page.component';
import { EvaluationsFacadeService } from '../services/evaluations-facade.service';
import { EvaluationsMapperService } from '../services/evaluations-mapper.service';
import { TableComponent } from '../../../components/table-component/table-component.component';
import { EvaluationModalComponent } from '../../../components/modals/evaluation-modal/evaluation-modal.component';

// ── Servicios de Estado (Mocks de fronteras externas) ────────────────────
import { ProposalService } from '../../../../modules/proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../../modules/preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../../modules/thesis-work/services/thesis-work.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';

// ── Modelos ──────────────────────────────────────────────────────────────
import { stateList } from '../../../../core/enums/state.enum';
import { Proposal } from '../../../../modules/proposal/interfaces/proposal.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';

describe('Integración [Shared Pages]: Evaluations Performed Page', () => {
  let component: EvaluationsPerformedPageComponent;
  let fixture: ComponentFixture<EvaluationsPerformedPageComponent>;

  // Mocks de servicios externos a la lógica de mapeo
  let downloadServiceMock: { download: jest.Mock };
  let notificationServiceMock: { show: jest.Mock };
  let proposalServiceMock: { allProposals: jest.Mock };
  let routerMock: { navigate: jest.Mock; url: string };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    downloadServiceMock = { download: jest.fn().mockResolvedValue(undefined) };
    notificationServiceMock = { show: jest.fn() };
    routerMock = { navigate: jest.fn(), url: '/history/proposal/prop-integration-1' };

    // Simulamos una propuesta con evaluaciones crudas
    const mockRawProposal: Partial<Proposal> = {
      id: 'prop-integration-1',
      title: 'Proyecto de Integración',
      evaluations: [
        {
          id: 'eval-1',
          evaluatorId: 'docente-1',
          evaluatorRole: 'Evaluador',
          veredict: stateList.APROBADO,
          observations: 'Cumple con los requisitos.',
          date: new Date('2026-05-10T10:00:00Z'),
        } as Evaluation
      ],
      documents: []
    };

    proposalServiceMock = { allProposals: jest.fn().mockReturnValue([mockRawProposal]) };

    const mockActivatedRoute = {
      paramMap: of({ get: (key: string) => (key === 'id' ? 'prop-integration-1' : null) }),
      parent: { paramMap: of({ get: () => null }) }
    };

    await TestBed.configureTestingModule({
      // Importamos el componente REAL (trae Table y Modal reales por ser standalone)
      imports: [EvaluationsPerformedPageComponent],
      providers: [
        provideNoopAnimations(), // <-- Agregamos el proveedor para desactivar las animaciones en el entorno de pruebas

        // Servicios de la página que queremos integrar REALES
        EvaluationsFacadeService,
        EvaluationsMapperService,

        // Mocks de dependencias externas
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ProposalService, useValue: proposalServiceMock },
        { provide: PreliminaryDraftService, useValue: { allPreliminaryDrafts: () => [] } },
        { provide: ThesisWorkService, useValue: { allThesisWorks: () => [] } },
        { provide: UserService, useValue: { getUserFullName: () => 'Docente Integrado' } },
        { provide: FileDownloadService, useValue: downloadServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationsPerformedPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('FLUJO E2E: Componente ➔ Fachada ➔ Mapper ➔ Renderizado de Tabla', () => {
    // 1. Act: Iniciamos el ciclo de vida de Angular
    fixture.detectChanges();

    // 2. Assert: Verificamos que la cadena de mapeo funcionó
    // (El mapper transformó 'docente-1' a 'Docente Integrado' y extrajo el veredicto)
    const computedEvaluations = component['evaluationsWithPermissions']();
    expect(computedEvaluations).toHaveLength(1);
    expect(computedEvaluations[0].evaluatorName).toBe('Docente Integrado');
    expect(computedEvaluations[0].veredict).toBe(stateList.APROBADO);

    // 3. Assert (DOM): Verificamos que el TableComponent real recibió los datos
    const tableElement = fixture.debugElement.query(By.directive(TableComponent));
    expect(tableElement).toBeTruthy();
    expect(tableElement.componentInstance.value).toEqual(computedEvaluations);
  });

  it('FLUJO DE INTERACCIÓN: Emitir acción desde la tabla ➔ Abrir Modal', () => {
    fixture.detectChanges();

    // 1. Localizamos la tabla real
    const tableDebugElement = fixture.debugElement.query(By.directive(TableComponent));
    const tableInstance = tableDebugElement.componentInstance as TableComponent;

    // 2. Simulamos que el usuario hizo clic en el botón de la tabla
    const targetRow = component['evaluationsWithPermissions']()[0];
    tableInstance.actionClick.emit({ action: 'view_details', row: targetRow });
    fixture.detectChanges();

    // 3. Assert: El estado del modal cambió y se renderizó en el DOM
    expect(component.modalState().open).toBe(true);
    const modalElement = fixture.debugElement.query(By.directive(EvaluationModalComponent));
    expect(modalElement).toBeTruthy();

    // Validamos que los inputs del modal recibieron la info correcta
    expect(modalElement.componentInstance.name).toBe('Docente Integrado');
    expect(modalElement.componentInstance.state).toBe(stateList.APROBADO);
  });

  it('FLUJO DE DESCARGA: Disparar descarga ➔ Fachada ➔ FileDownloadService ➔ Notificaciones', fakeAsync(() => {
    fixture.detectChanges();

    // 1. Forzamos la apertura del modal
    const mockRow = component['evaluationsWithPermissions']()[0];
    component.handleTableAction({ action: 'view_details', row: mockRow });
    fixture.detectChanges();

    const modalDebugElement = fixture.debugElement.query(By.directive(EvaluationModalComponent));
    const mockDocument = { name: 'acta.pdf', url: 'http://docs.com/acta.pdf' };

    // 2. Simulamos que el modal emite el evento de descarga
    modalDebugElement.componentInstance.onDownloadFile.emit(mockDocument);

    // 3. Damos tiempo a la promesa de descarga (handleDownload)
    tick();

    // 4. Assert: La Fachada Real orquestó las notificaciones y el FileDownloadService
    expect(notificationServiceMock.show).toHaveBeenCalledWith({
      title: 'Descarga',
      message: 'Iniciando descarga...',
      type: NotificationType.INFO
    });

    expect(downloadServiceMock.download).toHaveBeenCalledWith('http://docs.com/acta.pdf', 'acta.pdf');
  }));
});
