import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ProposalStorageService } from './proposal-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../users/services/user.service';

import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';

describe('ProposalStorageService', () => {
  let service: ProposalStorageService;

  // Tipado estricto sin 'any' usando Partial y as unknown
  let mockAuthService: Partial<AuthService>;
  let mockUserService: Partial<UserService>;

  const mockInitialUsers: User[] = [
    { id: 'user-001', firstName: 'Estudiante' } as User,
    { id: 'doc-005', firstName: 'Director' } as User,
    { id: 'doc-001', firstName: 'Codirector' } as User,
    { id: 'doc-002', firstName: 'Asesor' } as User,
  ];

  beforeEach(() => {
    // Spies para localStorage
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    mockAuthService = {
      currentUser: signal<User | null>(null),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    mockUserService = {
      getAllUsers: jest.fn().mockReturnValue(mockInitialUsers)
    };

    TestBed.configureTestingModule({
      providers: [
        ProposalStorageService,
        { provide: AuthService, useValue: mockAuthService as AuthService },
        { provide: UserService, useValue: mockUserService as UserService }
      ]
    });

    service = TestBed.inject(ProposalStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente e inicializar con datos por defecto', () => {
    expect(service).toBeTruthy();
    expect(mockUserService.getAllUsers).toHaveBeenCalled();

    const snapshot = service.getProposalsListSnapshot();
    expect(snapshot).toHaveLength(3); // Las 3 propuestas de getInitialData()
    expect(snapshot[0].id).toBe('prop-001');
  });

  describe('Señal computada: proposals', () => {
    it('debería retornar un array vacío si no hay usuario autenticado', () => {
      // currentUser es null por defecto en el mock
      expect(service.proposals()).toEqual([]);
    });

    it('debería retornar todas las propuestas activas para un ADMINISTRADOR', () => {
      // Simulamos admin
      (mockAuthService.currentUser as any) = signal({ id: 'admin-1' });
      (mockAuthService.hasAnyRole as jest.Mock).mockReturnValue(true);

      const proposals = service.proposals();

      // Debe retornar solo 2, porque 'prop-100' tiene isArchived: true
      expect(proposals).toHaveLength(2);
      expect(proposals.some(p => p.id === 'prop-100')).toBe(false);
    });

    it('debería retornar solo las propuestas donde el estudiante es autor', () => {
      // Simulamos al estudiante 'user-001' (No es admin)
      (mockAuthService.currentUser as any) = signal({ id: 'user-001' });
      (mockAuthService.hasAnyRole as jest.Mock).mockReturnValue(false);

      const proposals = service.proposals();

      // El user-001 es autor de prop-001 y prop-002, y ambas están activas
      expect(proposals).toHaveLength(2);
      expect(proposals[0].id).toBe('prop-001');
    });
  });

  describe('Mutaciones (updateProposals) y persistencia (effect)', () => {
    it('debería actualizar la lista y ejecutar el guardado en localStorage', () => {
      const newProposal = { id: 'new-999', title: 'Nueva' } as Proposal;

      service.updateProposals((list) => [...list, newProposal]);

      const snapshot = service.getProposalsListSnapshot();
      expect(snapshot).toHaveLength(4);
      expect(snapshot[3].id).toBe('new-999');

      // Forzamos el ciclo de Angular para que los effect() se disparen
      TestBed.flushEffects();

      expect(localStorage.setItem).toHaveBeenCalledWith('proposals', expect.any(String));
    });
  });

  describe('getById', () => {
    it('debería retornar un observable con la propuesta simulando asincronía', fakeAsync(() => {
      let result: Proposal | undefined;

      service.getById('prop-002').subscribe(res => result = res);

      tick(1000); // Avanzamos el delay

      expect(result).toBeDefined();
      expect(result?.title).toContain('Análisis de vulnerabilidades');
    }));
  });
});
