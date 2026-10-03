import 'fake-indexeddb/auto';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

import { EvaluationsPerformedPageComponent } from '../evaluations-performed-page.component';
import { EvaluationsFacadeService } from '../services/evaluations-facade.service';
import { EvaluationsMapperService } from '../services/evaluations-mapper.service';
import { TableComponent } from '../../../components/table-component/table-component.component';
import { EvaluationModalComponent } from '../../../components/modals/evaluation-modal/evaluation-modal.component';

import { ProposalService } from '../../../../modules/proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../../modules/preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../../modules/thesis-work/services/thesis-work.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';

import { stateList } from '../../../../core/enums/state.enum';
import { Proposal } from '../../../../modules/proposal/interfaces/proposal.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';

describe('Integración [Shared Pages]: Evaluations Performed Page', () => {
  let component: EvaluationsPerformedPageComponent;
  let fixture: ComponentFixture<EvaluationsPerformedPageComponent>;
  let downloadServiceMock: { download: jest.Mock<Promise<void>, [string, string]> };
  let notificationServiceMock: { show: jest.Mock };
  let proposalServiceMock: { allProposals: jest.Mock<Proposal[], []> };
  let routerMock: { navigate: jest.Mock; url: string };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();

    downloadServiceMock = { download: jest.fn().mockResolvedValue(undefined) };
    notificationServiceMock = { show: jest.fn() };
    routerMock = { navigate: jest.fn(), url: '/history/proposal/prop-integration-1' };

    const mockEvaluationPartial: Partial<Evaluation> = {
      id: 'eval-1',
      evaluatorId: 'docente-1',
      evaluatorRole: 'Evaluador',
      veredict: stateList.APROBADO,
      observations: 'Cumple con los requisitos.',
      date: new Date('2026-05-10T10:00:00Z'),
    };
    const mockEvaluation = mockEvaluationPartial as Evaluation;

    const mockRawProposalPartial: Partial<Proposal> = {
      id: 'prop-integration-1',
      title: 'Proyecto de Integración',
      evaluations: [mockEvaluation],
      documents: []
    };
    const mockRawProposal = mockRawProposalPartial as Proposal;

    proposalServiceMock = { allProposals: jest.fn().mockReturnValue([mockRawProposal]) };

    const mockActivatedRoute = {
      paramMap: of({ get: (key: string) => (key === 'id' ? 'prop-integration-1' : null) }),
      parent: { paramMap: of({ get: () => null }) }
    };

    await TestBed.configureTestingModule({
      imports: [EvaluationsPerformedPageComponent],
      providers: [
        provideNoopAnimations(),
        EvaluationsFacadeService,
        EvaluationsMapperService,
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

  it('FLUJO E2E: Componente ➔ Fachada ➔ Mapper ➔ Renderizado de Tabla', () => {
    fixture.detectChanges();
    const computedEvaluations = component['evaluationsWithPermissions']();
    expect(computedEvaluations).toHaveLength(1);
    expect(computedEvaluations[0].evaluatorName).toBe('Docente Integrado');
    expect(computedEvaluations[0].veredict).toBe(stateList.APROBADO);

    const tableElement = fixture.debugElement.query(By.directive(TableComponent));
    expect(tableElement).toBeTruthy();
    expect(tableElement.componentInstance.value).toEqual(computedEvaluations);
  });

  it('FLUJO DE INTERACCIÓN: Emitir acción desde la tabla ➔ Abrir Modal', () => {
    fixture.detectChanges();
    const tableDebugElement = fixture.debugElement.query(By.directive(TableComponent));
    const tableInstance = tableDebugElement.componentInstance as TableComponent;
    const targetRow = component['evaluationsWithPermissions']()[0];
    tableInstance.actionClick.emit({ action: 'view_details', row: targetRow });
    fixture.detectChanges();
    expect(component.modalState().open).toBe(true);
    const modalElement = fixture.debugElement.query(By.directive(EvaluationModalComponent));
    expect(modalElement).toBeTruthy();
    expect(modalElement.componentInstance.name).toBe('Docente Integrado');
    expect(modalElement.componentInstance.state).toBe(stateList.APROBADO);
  });

  it('FLUJO DE DESCARGA: Disparar descarga ➔ Fachada ➔ FileDownloadService ➔ Notificaciones', fakeAsync(() => {
    fixture.detectChanges();
    const mockRow = component['evaluationsWithPermissions']()[0];
    component.handleTableAction({ action: 'view_details', row: mockRow });
    fixture.detectChanges();
    const modalDebugElement = fixture.debugElement.query(By.directive(EvaluationModalComponent));
    const mockDocument = { name: 'acta.pdf', url: 'http://docs.com/acta.pdf' };
    modalDebugElement.componentInstance.onDownloadFile.emit(mockDocument);
    tick();
    expect(notificationServiceMock.show).toHaveBeenCalledWith({
      title: 'Descarga',
      message: 'Iniciando descarga...',
      type: NotificationType.INFO
    });

    expect(downloadServiceMock.download).toHaveBeenCalledWith('http://docs.com/acta.pdf', 'acta.pdf');
  }));
});
