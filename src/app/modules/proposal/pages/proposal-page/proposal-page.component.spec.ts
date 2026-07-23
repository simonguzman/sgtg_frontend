import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalPageComponent } from './proposal-page.component';
import { Router } from '@angular/router';
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { ProposalFacadeService } from './services/proposal-facade.service';
import { ProposalTableRow } from './models/proposal-page.model';

// Importar interfaces del table-component
import { TableButton, Column, TableRow } from '../../../../shared/components/table-component/table-component.component';

// 1. Importar componentes reales para removerlos
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// 2. Mocks de componentes standalone (Ahora SIN anys)
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

  // 🚀 ADIÓS ANY: Tipamos correctamente la fachada mockeada
  let mockFacade: {
    proposalsTableData: ReturnType<typeof signal<ProposalTableRow[]>>;
    headerButtons: ReturnType<typeof signal<TableButton[]>>;
    showRestrictedAccessNotification: jest.Mock;
    deleteProposal: jest.Mock;
  };

  const mockRow: ProposalTableRow = {
    id: 'prop-1',
    title: 'Test',
    description: 'Desc test',
    allowedActions: ['ver', 'ver descripcion', 'editar', 'eliminar']
  } as ProposalTableRow;

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    mockFacade = {
      proposalsTableData: signal([mockRow]),
      headerButtons: signal([]),
      showRestrictedAccessNotification: jest.fn(),
      deleteProposal: jest.fn()
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

    it('debe setear estado de eliminación al accionar "eliminar"', () => {
      component.handleTableAction({ action: 'eliminar', row: mockRow });
      expect(component.deleteState.show).toBeTruthy();
      expect(component.deleteState.id).toBe('prop-1');
    });
  });

  describe('handleHeaderButton', () => {
    it('debe navegar a crear propuesta', () => {
      // 🚀 SOLUCIÓN: Agregamos variant: 'primary'
      component.handleHeaderButton({ label: 'Registrar propuesta', icon: '', action: '', variant: 'primary' });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal/create']);
    });
  });

  describe('confirmDelete', () => {
    it('debe llamar a deleteProposal en fachada y resetear modal en éxito', () => {
      component.deleteState = { show: true, id: 'prop-1', title: 'Test', loading: false };

      component.confirmDelete();
      expect(component.deleteState.loading).toBeTruthy();

      const onSuccess = mockFacade.deleteProposal.mock.calls[0][1];
      onSuccess();

      expect(component.deleteState.show).toBeFalsy();
      expect(component.deleteState.id).toBeNull();
    });
  });
});
