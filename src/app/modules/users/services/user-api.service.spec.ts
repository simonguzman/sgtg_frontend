import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserApiService } from './user-api.service';
import { UserStorageService } from './user-storage.service';
import { User } from '../interfaces/user.interface';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../enum/identification-type.enum';
import { of } from 'rxjs';

describe('UserApiService', () => {
  let service: UserApiService;
  let mockStorageService: jest.Mocked<any>;

  const createMockUser = (id: string, roles: UserRoleType[] = [UserRoleType.DOCENTE]): User => ({
    id,
    idType: IdentificationType.CC,
    idNumber: 12345,
    firstName: 'Test',
    secondName: '',
    lastName: 'User',
    secondLastName: '',
    email: `${id}@test.com`,
    password: 'old-password',
    codeNumber: 100,
    state: UserState.active,
    roles
  });

  beforeEach(() => {
    mockStorageService = {
      getById: jest.fn(),
      getUsersSnapshot: jest.fn(),
      updateUsersList: jest.fn((cb: Function) => {
        cb([]);
      }),
      currentUser: jest.fn(),
      updateCurrentUser: jest.fn((cb: Function) => {
        cb(null);
      })
    };

    TestBed.configureTestingModule({
      providers: [
        UserApiService,
        { provide: UserStorageService, useValue: mockStorageService }
      ]
    });

    service = TestBed.inject(UserApiService);

    jest.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
  });

  it('debería instanciarse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  // ==========================================
  // QUERIES
  // ==========================================

  describe('Queries', () => {
    it('getUserById() debería retornar el flujo del Storage directamente', (done) => {
      const user = createMockUser('1');
      mockStorageService.getById.mockReturnValue(of(user));

      service.getUserById('1').subscribe(res => {
        expect(res).toEqual(user);
        expect(mockStorageService.getById).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('getUsersByRole() debería filtrar usuarios por rol tras un delay de 400ms', fakeAsync(() => {
      const u1 = createMockUser('1', [UserRoleType.ADMINISTRADOR]);
      const u2 = createMockUser('2', [UserRoleType.DOCENTE]);
      mockStorageService.getUsersSnapshot.mockReturnValue([u1, u2]);

      let emittedResult: User[] | undefined;
      service.getUsersByRole(UserRoleType.ADMINISTRADOR).subscribe(res => {
        emittedResult = res;
      });

      expect(emittedResult).toBeUndefined();
      tick(400);
      expect(emittedResult).toEqual([u1]);
    }));
  });

  // ==========================================
  // MUTATIONS
  // ==========================================

  describe('Mutations', () => {
    it('createUser() debería asignar UUID, estado activo y agregarlo a la lista', fakeAsync(() => {
      const baseUser = createMockUser('');
      let savedUser: User | undefined;

      service.createUser(baseUser).subscribe(res => savedUser = res);

      tick(1000);

      expect(savedUser).toBeDefined();
      expect(savedUser?.id).toBe('11111111-1111-1111-1111-111111111111');
      expect(savedUser?.state).toBe(UserState.active);
      expect(mockStorageService.updateUsersList).toHaveBeenCalled();
    }));

    it('updateUser() debería modificar los campos e interceptar si es el currentUser', fakeAsync(() => {
      const targetUser = createMockUser('1');
      mockStorageService.currentUser.mockReturnValue(targetUser);

      mockStorageService.updateUsersList.mockImplementationOnce((cb: Function) => {
        const result = cb([targetUser]);
        expect(result[0].firstName).toBe('NuevoNombre');
      });

      service.updateUser('1', { firstName: 'NuevoNombre' }).subscribe();
      tick(800);

      expect(mockStorageService.updateUsersList).toHaveBeenCalled();
      expect(mockStorageService.updateCurrentUser).toHaveBeenCalled();
    }));

    it('updateUserPassword() debería alterar únicamente el campo password', fakeAsync(() => {
      const targetUser = createMockUser('1');

      mockStorageService.updateUsersList.mockImplementationOnce((cb: Function) => {
        const result = cb([targetUser]);
        expect(result[0].password).toBe('new-secure-password');
      });

      service.updateUserPassword('1', 'new-secure-password').subscribe();
      tick(600);

      expect(mockStorageService.updateUsersList).toHaveBeenCalled();
    }));

    it('softDeleteUser() debería conmutar el estado del usuario', fakeAsync(() => {
      const activeUser = createMockUser('1');

      mockStorageService.updateUsersList.mockImplementationOnce((cb: Function) => {
        const result = cb([activeUser]);
        expect(result[0].state).toBe(UserState.inactive);
      });

      service.softDeleteUser('1').subscribe();
      tick(800);

      expect(mockStorageService.updateUsersList).toHaveBeenCalled();
    }));

    it('addRoleToUser() debería añadir un rol nuevo al usuario si no lo tiene', fakeAsync(() => {
      const user = createMockUser('1', [UserRoleType.DOCENTE]);

      mockStorageService.updateUsersList.mockImplementationOnce((cb: Function) => {
        const result = cb([user]);
        expect(result[0].roles).toContain(UserRoleType.ADMINISTRADOR);
      });

      service.addRoleToUser('1', UserRoleType.ADMINISTRADOR).subscribe();
      tick(500);

      expect(mockStorageService.updateUsersList).toHaveBeenCalled();
    }));

    it('removeRoleFromUser() debería sustraer el rol indicado del perfil', fakeAsync(() => {
      const user = createMockUser('1', [UserRoleType.DOCENTE, UserRoleType.ADMINISTRADOR]);

      mockStorageService.updateUsersList.mockImplementationOnce((cb: Function) => {
        const result = cb([user]);
        expect(result[0].roles).not.toContain(UserRoleType.ADMINISTRADOR);
        expect(result[0].roles).toContain(UserRoleType.DOCENTE);
      });

      service.removeRoleFromUser('1', UserRoleType.ADMINISTRADOR).subscribe();
      tick(500);

      expect(mockStorageService.updateUsersList).toHaveBeenCalled();
    }));

    it('removeRolesFromUsers() debería limpiar los roles en masa de múltiples usuarios', fakeAsync(() => {
      const user1 = createMockUser('1', [UserRoleType.DOCENTE, UserRoleType.ADMINISTRADOR]);
      const user2 = createMockUser('2', [UserRoleType.ADMINISTRADOR]);
      mockStorageService.currentUser.mockReturnValue(user1);

      mockStorageService.updateUsersList.mockImplementationOnce((cb: Function) => {
        const result = cb([user1, user2]);
        expect(result[0].roles).not.toContain(UserRoleType.ADMINISTRADOR);
        expect(result[1].roles).not.toContain(UserRoleType.ADMINISTRADOR);
      });

      service.removeRolesFromUsers(['1', '2'], [UserRoleType.ADMINISTRADOR]).subscribe();
      tick(600);

      expect(mockStorageService.updateUsersList).toHaveBeenCalled();
      expect(mockStorageService.updateCurrentUser).toHaveBeenCalled();
    }));
  });
});
