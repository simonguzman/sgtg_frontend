import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { ProposalApiService } from './proposal-api.service';
import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

describe('ProposalApiService', () => {
  let service: ProposalApiService;

  // 1. Reemplazamos los 'any' por las clases originales envueltas en jest.Mocked
  let mockStorageService: jest.Mocked<ProposalStorageService>;
  let mockRulesService: jest.Mocked<ProposalRulesService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  beforeEach(() => {
    // Sobrescribir crypto para evitar IDs aleatorios que rompan los tests
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('mocked-uuid') }
    });

    // 2. Inicializamos los mocks haciendo un cast 'as unknown as...'
    // Esto evita errores por propiedades privadas omitidas, pero mantiene el tipado
    // estricto para las firmas de los métodos que sí estamos mockeando.
    mockStorageService = {
      getById: jest.fn(),
      updateProposals: jest.fn(),
      getProposalsListSnapshot: jest.fn()
    } as unknown as jest.Mocked<ProposalStorageService>;

    mockRulesService = {
      handleRoleExchange: jest.fn()
    } as unknown as jest.Mocked<ProposalRulesService>;

    mockUserService = {
      addRoleToUser: jest.fn(),
      removeRoleFromUser: jest.fn(),
      users: signal([{ id: 'comite-1', roles: [UserRoleType.COMITE] }])
    } as unknown as jest.Mocked<UserService>;

    mockEventBusService = {
      emit: jest.fn()
    } as unknown as jest.Mocked<EventBusService>;

    TestBed.configureTestingModule({
      providers: [
        ProposalApiService,
        { provide: ProposalStorageService, useValue: mockStorageService },
        { provide: ProposalRulesService, useValue: mockRulesService },
        { provide: UserService, useValue: mockUserService },
        { provide: EventBusService, useValue: mockEventBusService }
      ]
    });

    service = TestBed.inject(ProposalApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getProposalByIdMock', () => {
    it('debería retornar un observable con la propuesta si existe', (done) => {
      const mockProp = { id: '1', title: 'Test' } as Proposal;
      mockStorageService.getById.mockReturnValue(of(mockProp));

      service.getProposalByIdMock('1').subscribe((result) => {
        expect(result).toEqual(mockProp);
        expect(mockStorageService.getById).toHaveBeenCalledWith('1');
        done();
      });
    });
  });

  describe('createProposalMock', () => {
    it('debería crear la propuesta, actualizar almacenamiento, asignar roles y notificar', fakeAsync(() => {
      const newProposalPayload = {
        title: 'Nueva Propuesta',
        authors: [{ id: 'student-1' }],
        director: { id: 'director-1' },
        codirector: { id: 'codirector-1' }
      } as Proposal;

      let resultProp: Proposal | undefined;

      service.createProposalMock(newProposalPayload).subscribe((res) => {
        resultProp = res;
      });

      // Avanzamos el tiempo virtual para superar el delay(1000)
      tick(1000);

      // Verificamos la creación
      expect(resultProp).toBeDefined();
      expect(resultProp?.id).toBe('mocked-uuid');
      expect(resultProp?.state).toBe(stateList.EN_REVISION);
      expect(mockStorageService.updateProposals).toHaveBeenCalled();

      // Verificamos asignación de roles
      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('director-1', UserRoleType.DIRECTOR);
      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('codirector-1', UserRoleType.CODIRECTOR);

      // Verificamos la emisión del evento (Notificaciones)
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PROPOSAL_CREATED,
          payload: { proposalId: 'mocked-uuid', proposalTitle: 'Nueva Propuesta' }
        })
      );

      // Verificamos que los IDs a notificar incluyan autores, director, codirector y comité
      const emitCallArgs = mockEventBusService.emit.mock.calls[0][0];
      const targetUserIds = emitCallArgs.targetUserIds;
      expect(targetUserIds).toContain('student-1');
      expect(targetUserIds).toContain('director-1');
      expect(targetUserIds).toContain('codirector-1');
      expect(targetUserIds).toContain('comite-1');
    }));
  });

  describe('updateProposalMock', () => {
    it('debería arrojar error si la propuesta no existe', () => {
      mockStorageService.getProposalsListSnapshot.mockReturnValue([]);

      expect(() => service.updateProposalMock('99', { title: 'Modificado' })).toThrow('Propuesta con ID 99 no encontrada.');
    });

    it('debería actualizar la propuesta y verificar el intercambio de roles', fakeAsync(() => {
      const oldProposal = { id: '1', title: 'Viejo', codirector: { id: 'co-1' } } as Proposal;
      mockStorageService.getProposalsListSnapshot.mockReturnValue([oldProposal]);

      const changes = { title: 'Nuevo', codirector: { id: 'co-2' } } as Partial<Proposal>;

      let resultProp: Proposal | undefined;
      service.updateProposalMock('1', changes).subscribe(res => resultProp = res);

      tick(1000);

      expect(resultProp?.title).toBe('Nuevo');
      expect(resultProp?.codirector?.id).toBe('co-2');

      // Verifica que el RulesService manejó la lógica de intercambio de roles
      expect(mockRulesService.handleRoleExchange).toHaveBeenCalledWith(
        'co-1', // Viejo
        'co-2', // Nuevo
        UserRoleType.CODIRECTOR,
        '1'     // ID de propuesta
      );

      expect(mockStorageService.updateProposals).toHaveBeenCalled();
    }));
  });

  describe('deleteProposalMock', () => {
    it('debería retornar false si la propuesta a eliminar no existe', (done) => {
      mockStorageService.getProposalsListSnapshot.mockReturnValue([]);

      service.deleteProposalMock('99').subscribe(result => {
        expect(result).toBe(false);
        done();
      });
    });

    it('debería remover el rol si el usuario ya no está vinculado a otra propuesta', fakeAsync(() => {
      const proposalToDelete = { id: '1', codirector: { id: 'co-1' } } as Proposal;

      // Hacemos que el mock simule el flujo temporal:
      // 1ra vez: Retorna la lista con la propuesta (para encontrarla e iniciar el borrado).
      // 2da vez: Retorna una lista vacía (simulando que ya se filtró/borró y validando que el usuario quedó libre).
      mockStorageService.getProposalsListSnapshot
        .mockReturnValueOnce([proposalToDelete])
        .mockReturnValueOnce([]);

      let result = false;
      service.deleteProposalMock('1').subscribe(res => result = res);

      tick(1000);

      expect(result).toBe(true);
      expect(mockStorageService.updateProposals).toHaveBeenCalled();

      // Ahora la validación pasará correctamente porque el usuario ya no aparece en el snapshot
      expect(mockUserService.removeRoleFromUser).toHaveBeenCalledWith('co-1', UserRoleType.CODIRECTOR);
    }));

    it('debería mantener el rol si el usuario sigue vinculado a otra propuesta', fakeAsync(() => {
      const proposalToDelete = { id: '1', codirector: { id: 'co-1' } } as Proposal;
      const otherProposal = { id: '2', codirector: { id: 'co-1' } } as Proposal;

      // Existen dos propuestas vinculadas al mismo codirector
      mockStorageService.getProposalsListSnapshot.mockReturnValue([proposalToDelete, otherProposal]);

      let result = false;
      service.deleteProposalMock('1').subscribe(res => result = res);

      tick(1000);

      expect(result).toBe(true);
      // NO se debe remover el rol porque 'co-1' sigue en la propuesta '2'
      expect(mockUserService.removeRoleFromUser).not.toHaveBeenCalled();
    }));
  });
});
