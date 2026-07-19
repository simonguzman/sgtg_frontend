/* tslint:disable:no-unused-variable */
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, Subject, of } from 'rxjs';
import { ProposalService } from '../../services/proposal.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ProposalPageComponent } from './proposal-page.component';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';

describe('ProposalPageComponent', () => {
  let component: ProposalPageComponent;
  let fixture: ComponentFixture<ProposalPageComponent>;

  let mockProposalService: any;
  let mockAuthService: any;
  let mockNotificationService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockProposalService = {
      // Usamos una estructura que coincida con lo que el componente espera
      proposals: signal([
        {
          id: '1',
          title: 'Propuesta Test',
          description: 'Desc',
          state: 'Aprobado',
          director: { id: 'director-123' }
        }
      ]),
      deleteProposalMock: jest.fn()
    };

    mockAuthService = {
      hasAnyRole: jest.fn(),
      // CORRECCIÓN: Agregamos el signal currentUser que faltaba
      currentUser: signal({ id: 'user-456', roles: [UserRoleType.ESTUDIANTE] })
    };

    mockNotificationService = {
      show: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProposalPageComponent],
      providers: [
        { provide: ProposalService, useValue: mockProposalService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProposalPageComponent);
    component = fixture.componentInstance;
  });

  it('Debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('Debe restringir allowedActions si el usuario no es dueño ni ADMIN', () => {
    // Usuario normal que no es el director de la propuesta
    mockAuthService.hasAnyRole.mockReturnValue(false);
    mockAuthService.currentUser.set({ id: 'otro-id' });

    fixture.detectChanges(); // Disparamos el computed

    const proposals = component['proposalsWithPermissions']();
    const actions = proposals[0].allowedActions;

    // Según tu lógica: ['ver descripcion', 'ver']
    expect(actions).not.toContain('editar');
    expect(actions).not.toContain('eliminar');
    expect(actions.length).toBe(2);
  });

  it('Debe permitir todas las acciones si el usuario es ADMINISTRADOR', () => {
    mockAuthService.hasAnyRole.mockReturnValue(true); // Es Admin

    fixture.detectChanges();

    const proposals = component['proposalsWithPermissions']();
    const actions = proposals[0].allowedActions;

    expect(actions).toContain('editar');
    expect(actions).toContain('eliminar');
    expect(actions.length).toBe(4);
  });

  it('Debe navegar a la creación al pulsar "Registrar propuesta"', () => {
    const btn = { label: 'Registrar propuesta', variant: 'primary' };
    component.handleHeaderButton(btn as any);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal/create']);
  });

  it('Debe abrir el modal de descripción con el contenido correcto', () => {
    const mockRow: any = { description: 'Contenido de prueba', allowedActions: ['ver descripcion'] };
    component.handleTableAction({ action: 'ver descripcion', row: mockRow });
    expect(component.descriptionModal.show).toBe(true);
    expect(component.descriptionModal.content).toBe('Contenido de prueba');
  });

  it('Debe completar el flujo de eliminación exitosamente', fakeAsync(() => {
    const proposalId = '123';
    // Usamos Subject para controlar exactamente cuándo responde el servicio
    const deleteSubject = new Subject<void>();
    mockProposalService.deleteProposalMock.mockReturnValue(deleteSubject.asObservable());

    component.deleteState = { show: true, id: proposalId, title: 'Test', loading: false };

    // 1. Act: Iniciar eliminación
    component.confirmDelete();

    // 2. Assert: Verificar que entró en estado de carga
    // Ahora sí será true porque el Subject no ha emitido nada aún
    expect(component.deleteState.loading).toBe(true);

    // 3. Act: Emitir éxito
    deleteSubject.next();
    deleteSubject.complete();

    tick(); // Procesar el microtask del observable
    fixture.detectChanges();

    // 4. Assert final
    expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
      type: NotificationType.CONFIRMATION
    }));
    expect(component.deleteState.show).toBe(false);
    expect(component.deleteState.loading).toBe(false);
  }));

  it('Debe manejar errores en la eliminación', fakeAsync(() => {
    mockProposalService.deleteProposalMock.mockReturnValue(throwError(() => new Error('Error')));
    component.deleteState = { show: true, id: '1', title: 'Test', loading: false };

    component.confirmDelete();
    tick();

    expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
      type: NotificationType.ERROR
    }));
    expect(component.deleteState.loading).toBe(false);
    expect(component.deleteState.show).toBe(true); // El modal sigue abierto en error
  }));
});
