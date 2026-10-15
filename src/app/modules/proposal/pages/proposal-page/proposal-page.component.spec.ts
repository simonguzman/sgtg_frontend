import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalPageComponent } from './proposal-page.component';
import { Router } from '@angular/router';
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { ProposalFacadeService } from './services/proposal-facade.service';
import { ProposalTableRow } from './models/proposal-page.model';
import { TableButton, Column, TableRow } from '../../../../shared/components/table-component/table-component.component';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() value: TableRow[] = [];
  @Input() headerButtons: TableButton[] = [];
  @Input() columns: Column[] = [];
  @Input() paginator = false;
  @Input() filterFields: string[] = [];
  @Input() emptyMessage = '';
  @Output() actionClick = new EventEmitter<{ action: string; row: TableRow }>();
  @Output() headerButtonClick = new EventEmitter<TableButton>();
}

@Component({ selector: 'app-description-modal', standalone: true, template: '' })
class MockDescriptionModalComponent {
  @Input() isOpen = false;
  @Input() titleDescription = '';
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

describe('ProposalPageComponent', () => {
  let component: ProposalPageComponent;
  let fixture: ComponentFixture<ProposalPageComponent>;
  let mockRouter: { navigate: jest.Mock };
  let mockFacade: {
    proposalsTableData: ReturnType<typeof signal<ProposalTableRow[]>>;
    headerButtons: ReturnType<typeof signal<TableButton[]>>;
    showRestrictedAccessNotification: jest.Mock;
    annulProposal: jest.Mock;
  };

  const mockRow: ProposalTableRow = {
    id: 'prop-1',
    title: 'Test',
    description: 'Desc test',
    allowedActions: ['ver', 'ver descripcion', 'editar', 'anular']
  } as ProposalTableRow;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockRouter = { navigate: jest.fn() };
    mockFacade = {
      proposalsTableData: signal([mockRow]),
      headerButtons: signal([]),
      showRestrictedAccessNotification: jest.fn(),
      annulProposal: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProposalPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ProposalFacadeService, useValue: mockFacade }
      ]
    })
    .overrideComponent(ProposalPageComponent, {
      remove: { imports: [TableComponent, DescriptionModalComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockTableComponent, MockDescriptionModalComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleTableAction', () => {
    it('debe notificar si la acción no está permitida', () => {
      const restrictedRow = { ...mockRow, allowedActions: ['ver'] };

      component.handleTableAction({ action: 'editar', row: restrictedRow });

      expect(mockFacade.showRestrictedAccessNotification).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debe abrir modal de descripción al accionar "ver descripcion"', () => {
      component.handleTableAction({ action: 'ver descripcion', row: mockRow });

      expect(component.descriptionModal.show).toBeTruthy();
      expect(component.descriptionModal.content).toBe('Desc test');
    });

    it('debe navegar al detalle al accionar "ver"', () => {
      component.handleTableAction({ action: 'ver', row: mockRow });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal/details', 'prop-1']);
    });

    it('debe abrir el modal de anulación al accionar "anular"', () => {
      component.handleTableAction({ action: 'anular', row: mockRow });
      expect(component.annulState.show).toBeTruthy();
      expect(component.annulState.id).toBe('prop-1');
    });
  });

  describe('handleHeaderButton', () => {
    it('debe navegar a crear propuesta', () => {
      component.handleHeaderButton({ label: 'Registrar propuesta', icon: '', action: '', variant: 'primary' });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal/create']);
    });
  });

  describe('confirmAnnul', () => {
    it('debe llamar a annulProposal en fachada y resetear modal en éxito', () => {
      component.annulState = { show: true, id: 'prop-1', title: 'Test', loading: false };

      component.confirmAnnul('Motivo');
      expect(component.annulState.loading).toBeTruthy();

      const onSuccess = mockFacade.annulProposal.mock.calls[0][2];
      onSuccess();

      expect(component.annulState.show).toBeFalsy();
      expect(component.annulState.id).toBeNull();
    });
  });
});
