// src/app/modules/users/integration/user-creation.integration.spec.ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserService } from '../services/user.service';
import { UserStorageService } from '../services/user-storage.service';
import { UserApiService } from '../services/user-api.service';
import { UserFormatterService } from '../services/user-formatter.service';
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

describe('Integración [Users]: Registro de un nuevo usuario', () => {
  let userService: UserService;
  let userStorage: UserStorageService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [UserService, UserStorageService, UserApiService, UserFormatterService]
    });
    userService = TestBed.inject(UserService);
    userStorage = TestBed.inject(UserStorageService);
    userStorage.updateUsersList(() => []);
  });

  afterEach(() => {
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('debe generar un id nuevo, activar por defecto al usuario y persistirlo en el storage', fakeAsync(() => {
    const newUserPayload: User = {
      id: 'temp-discarded', idType: IdentificationType.CC, idNumber: 987654321,
      firstName: 'Nuevo', secondName: '', lastName: 'Usuario', secondLastName: '',
      codeNumber: 202699, email: 'nuevo@test.com', password: 'temporal123',
      state: UserState.inactive, roles: [UserRoleType.ESTUDIANTE]
    };

    let created: User | undefined;
    userService.createUserMock(newUserPayload).subscribe(result => { created = result; });
    tick(1000);

    // El estado del payload (inactive) se ignora — createUser fuerza active.
    expect(created?.id).toBeTruthy();
    expect(created?.id).not.toBe('temp-discarded');
    expect(created?.state).toBe(UserState.active);

    const stored = userStorage.getUsersSnapshot().find(u => u.id === created?.id);
    expect(stored?.email).toBe('nuevo@test.com');
  }));

  it('no debe alterar a los usuarios ya existentes al registrar uno nuevo', fakeAsync(() => {
    const existing: User = {
      id: 'existing-1', idType: IdentificationType.CC, idNumber: 111,
      firstName: 'Existente', secondName: '', lastName: 'Previo', secondLastName: '',
      codeNumber: 1, email: 'existente@test.com', password: 'hash',
      state: UserState.active, roles: []
    };
    userStorage.updateUsersList(() => [existing]);

    const secondPayload: User = { ...existing, id: 'temp-discarded', email: 'segundo@test.com' };
    userService.createUserMock(secondPayload).subscribe();
    tick(1000);

    expect(userStorage.getUsersSnapshot()).toHaveLength(2);
    expect(userStorage.getUsersSnapshot().find(u => u.id === 'existing-1')?.email).toBe('existente@test.com');
  }));
});
