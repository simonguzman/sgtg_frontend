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

// Importamos los componentes hijos para poder interactuar con sus instancias reales
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
    // Silenciar advertencias de UI de terceros y manejos intencionales
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };

    // 1. Mock de Seguridad (Acceso Global garantizado para simplificar lectura de BD)
    const mockAuthService = {
      currentUser: signal({ id: 'director-123' } as User),
      hasAnyRole: jest.fn().mockReturnValue(true)
    };

    // 2. Mocks de la capa de datos. Proveemos registros "Archivados" para que pasen el filtro
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
      // Importamos el componente REAL y sus dependencias directas
      imports: [HistoryPageComponent],
      providers: [
        provideAnimations(), // Requerido para modales y componentes UI
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Title, useValue: { setTitle: jest.fn() } },
        {
          provide: BreadcrumbService,
          useValue: { setDynamicBreadcrumb: jest.fn(), setDynamicTitle: jest.fn(), clearDynamicBreadcrumb: jest.fn() }
        },
        { provide: AuthService, useValue: mockAuthService },

        // Inyectamos los mocks de la capa de acceso a datos
        { provide: ProposalService, useValue: mockProposalService },
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: ThesisWorkService, useValue: mockThesisService },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable(); // Esperar a que Signals y Effects se asienten
  });

  describe('Carga Inicial e Interacción con el DOM de la Tabla', () => {
    it('debe procesar los datos a través del servicio real de Propuestas y renderizarlos en la tabla', () => {
      // Obtenemos el DOM real de la tabla
      const tableDom = fixture.debugElement.query(By.css('app-table-component')).nativeElement as HTMLElement;

      // Verificamos que la data simulada atravesó el mapper, el helper de acceso y llegó al DOM
      expect(tableDom.textContent).toContain('Tesis de Integración Profunda');
      expect(tableDom.textContent).toContain('Estudiante Prueba');
    });
  });

  describe('Flujo de Cambio de Estrategia mediante Tabs Reales', () => {
    it('debe recalcular columnas, consultar el servicio correcto y mutar el DOM al cambiar de pestaña', async () => {
      // 1. Obtenemos la instancia real del componente hijo (Tabs) y emitimos su Output
      const tabsInstance = fixture.debugElement.query(By.directive(TabsComponent)).componentInstance as TabsComponent;
      tabsInstance.tabChange.emit('ANTEPROYECTOS');

      fixture.detectChanges();
      await fixture.whenStable();

      // 2. Comprobamos que el DOM mutó reflejando los datos del servicio de Anteproyectos
      const tableDom = fixture.debugElement.query(By.css('app-table-component')).nativeElement as HTMLElement;
      expect(tableDom.textContent).not.toContain('Tesis de Integración Profunda');
      expect(tableDom.textContent).toContain('Anteproyecto de Redes Neuronales');

      // 3. Volvemos a cambiar de estrategia hacia Trabajos de Grado
      tabsInstance.tabChange.emit('TRABAJOS');

      fixture.detectChanges();
      await fixture.whenStable();

      // 4. Verificamos que el formateador de fechas del servicio real funcionó y llegó a la vista
      const newTableDom = fixture.debugElement.query(By.css('app-table-component')).nativeElement as HTMLElement;
      expect(newTableDom.textContent).toContain('Trabajo Final Publicado');
    });
  });

  describe('Interacción con Modales Compartidos', () => {
    it('debe pasar los datos de la fila seleccionada al Modal Real y cambiar su estado visual', async () => {
      // 1. Buscamos el modal y confirmamos que inicia cerrado
      const modalInstance = fixture.debugElement.query(By.directive(DescriptionModalComponent)).componentInstance as DescriptionModalComponent;
      expect(modalInstance.isOpen).toBe(false);

      // 2. Emitimos el evento desde la tabla como lo haría el usuario al hacer clic en un botón de acción
      const tableInstance = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as TableComponent;
      tableInstance.actionClick.emit({
        action: 'ver descripcion',
        row: { id: 'prop-101', description: 'Descripción detallada de la propuesta de IA' }
      });

      fixture.detectChanges();
      await fixture.whenStable();

      // 3. Confirmamos que la señal fluyó hacia abajo (@Input) y abrió el modal real con los datos mapeados
      expect(modalInstance.isOpen).toBe(true);
      expect(modalInstance.description).toBe('Descripción detallada de la propuesta de IA');
      expect(modalInstance.titleDescription).toBe('Descripción del registro archivado');
    });
  });

  describe('Navegación Dinámica según Estrategia', () => {
    it('debe enrutar a la URL correcta basándose en el diccionario de la pestaña activa', () => {
      // Estando en la pestaña PROPUESTAS
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
