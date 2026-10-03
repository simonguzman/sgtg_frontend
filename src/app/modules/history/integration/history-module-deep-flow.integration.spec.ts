import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { Title, By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HistoryPageComponent } from '../pages/history-page/history-page.component';
import { BreadcrumbService } from '../../../core/services/breadcrumb/breadcrumb.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { UserService } from '../../users/services/user.service';
import { stateList } from '../../../core/enums/state.enum';
import { User } from '../../users/interfaces/user.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { TabsComponent } from '../../../shared/components/tabs/tabs.component';
import { TableComponent } from '../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../shared/components/modals/description-modal/description-modal.component';

describe('Integración [Módulo Historial]: Flujo Profundo (Servicios de Dominio + Componentes Reales)', () => {
  let component: HistoryPageComponent;
  let fixture: ComponentFixture<HistoryPageComponent>;
  let mockRouter: { navigate: jest.Mock };
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    const mockAuthService = {
      currentUser: signal({ id: 'director-123' } as User),
      hasAnyRole: jest.fn().mockReturnValue(true)
    };
    const mockProposalService = {
      allProposals: jest.fn().mockReturnValue([{
        id: 'prop-101',
        title: 'Tesis de Integración Profunda',
        isArchived: true,
        state: stateList.APROBADO,
        description: 'Descripción detallada de la propuesta de IA'
      } as Partial<Proposal>])
    };
    const mockDraftService = {
      allPreliminaryDrafts: jest.fn().mockReturnValue([{
        preliminaryDraftId: 'draft-202',
        isArchived: true,
        state: stateList.EN_REVISION,
        proposalData: { title: 'Anteproyecto de Redes Neuronales' }
      } as Partial<PreliminaryDraft>])
    };
    const mockThesisService = {
      allThesisWorks: jest.fn().mockReturnValue([{
        thesisWorkId: 'thesis-303',
        isArchived: true,
        state: stateList.APROBADO,
        preliminaryDraftData: {
          proposalData: { title: 'Trabajo Final Publicado' },
          maximumDeliveryDate: new Date('2026-12-31T00:00:00')
        }
      } as Partial<ThesisWork>])
    };
    const mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Estudiante Prueba')
    };
    await TestBed.configureTestingModule({
      imports: [HistoryPageComponent],
      providers: [
        provideAnimations(),
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Title, useValue: { setTitle: jest.fn() } },
        {
          provide: BreadcrumbService,
          useValue: { setDynamicBreadcrumb: jest.fn(), setDynamicTitle: jest.fn(), clearDynamicBreadcrumb: jest.fn() }
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProposalService, useValue: mockProposalService },
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: ThesisWorkService, useValue: mockThesisService },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  describe('Carga Inicial e Interacción con el DOM de la Tabla', () => {
    it('debe procesar los datos a través del servicio real de Propuestas y renderizarlos en la tabla', () => {
      const tableDom = fixture.debugElement.query(By.css('app-table-component')).nativeElement as HTMLElement;
      expect(tableDom.textContent).toContain('Tesis de Integración Profunda');
      expect(tableDom.textContent).toContain('Estudiante Prueba');
    });
  });
  describe('Flujo de Cambio de Estrategia mediante Tabs Reales', () => {
    it('debe recalcular columnas, consultar el servicio correcto y mutar el DOM al cambiar de pestaña', async () => {
      const tabsInstance = fixture.debugElement.query(By.directive(TabsComponent)).componentInstance as TabsComponent;
      tabsInstance.tabChange.emit('ANTEPROYECTOS');
      fixture.detectChanges();
      await fixture.whenStable();
      const tableDom = fixture.debugElement.query(By.css('app-table-component')).nativeElement as HTMLElement;
      expect(tableDom.textContent).not.toContain('Tesis de Integración Profunda');
      expect(tableDom.textContent).toContain('Anteproyecto de Redes Neuronales');
      tabsInstance.tabChange.emit('TRABAJOS');
      fixture.detectChanges();
      await fixture.whenStable();
      const newTableDom = fixture.debugElement.query(By.css('app-table-component')).nativeElement as HTMLElement;
      expect(newTableDom.textContent).toContain('Trabajo Final Publicado');
    });
  });
  describe('Interacción con Modales Compartidos', () => {
    it('debe pasar los datos de la fila seleccionada al Modal Real y cambiar su estado visual', async () => {
      const modalInstance = fixture.debugElement.query(By.directive(DescriptionModalComponent)).componentInstance as DescriptionModalComponent;
      expect(modalInstance.isOpen).toBe(false);
      const tableInstance = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as TableComponent;
      tableInstance.actionClick.emit({
        action: 'ver descripcion',
        row: { id: 'prop-101', description: 'Descripción detallada de la propuesta de IA' }
      });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(modalInstance.isOpen).toBe(true);
      expect(modalInstance.description).toBe('Descripción detallada de la propuesta de IA');
      expect(modalInstance.titleDescription).toBe('Descripción del registro archivado');
    });
  });
  describe('Navegación Dinámica según Estrategia', () => {
    it('debe enrutar a la URL correcta basándose en el diccionario de la pestaña activa', () => {
      const tableInstance = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as TableComponent;
      tableInstance.actionClick.emit({
        action: 'ver',
        row: { id: 'prop-101' }
      });
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['proposal-details', 'prop-101'],
        expect.anything()
      );
    });
  });
});
