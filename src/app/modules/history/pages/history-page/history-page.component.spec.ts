import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { HistoryPageComponent } from './history-page.component';
import { ARCHIVED_WORK_ACTIONS, ArchivedWorksService } from './services/archived-works.service';
import { TableRow } from '../../../../shared/components/table-component/table-component.component';

describe('HistoryPageComponent', () => {
  let fixture: ComponentFixture<HistoryPageComponent>;
  let component: HistoryPageComponent;
  let router: { navigate: jest.Mock };
  const route = {} as ActivatedRoute;

  const fila: TableRow = {
    id: '15', title: 'Sistema de gestión', description: 'Descripción del trabajo',
    justification: 'Cambio de modalidad', allowedActions: []
  };

  beforeEach(async () => {
    router = { navigate: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [HistoryPageComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: ArchivedWorksService, useValue: { columns: [], tableData: signal([fila]) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentInstance;
  });

  it('muestra la lista de trabajos archivados', () => {
    expect(component.tableData()).toEqual([fila]);
  });

  it('la descripción incluye las observaciones del cierre', () => {
    component.handleTableAction({ action: ARCHIVED_WORK_ACTIONS.DESCRIPCION, row: fila });
    expect(component.descriptionModal()).toEqual({
      show: true,
      title: 'Sistema de gestión',
      content: 'Descripción del trabajo\n\nObservaciones: Cambio de modalidad'
    });
  });

  it('cada acción lleva al detalle de la etapa dentro del historial', () => {
    component.handleTableAction({ action: ARCHIVED_WORK_ACTIONS.PROPUESTA, row: fila });
    component.handleTableAction({ action: ARCHIVED_WORK_ACTIONS.ANTEPROYECTO, row: fila });
    component.handleTableAction({ action: ARCHIVED_WORK_ACTIONS.TRABAJO, row: fila });
    expect(router.navigate.mock.calls).toEqual([
      [['proposal-details', '15'], { relativeTo: route }],
      [['preliminary-draft-details', '15'], { relativeTo: route }],
      [['thesis-work-details', '15'], { relativeTo: route }]
    ]);
  });

  it('una acción desconocida no navega', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    component.handleTableAction({ action: 'otra', row: fila });
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
