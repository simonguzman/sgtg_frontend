import { computed, inject, Injectable, signal } from '@angular/core';
import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';

/**
 * Lista de usuarios en memoria, con los grupos por rol que usan los formularios. El usuario en sesión es el
 * de `AuthStorageService`.
 */
@Injectable({
  providedIn: 'root'
})
export class UserStorageService {
  /** Claves de localStorage de versiones anteriores, que se borran al arrancar. */
  private readonly LEGACY_KEYS = ['sgtg_users', 'sgtg_current_session'];
  private readonly authStorage = inject(AuthStorageService);

  /** Usuarios del backend; los carga `UserService` al iniciar sesión */
  private readonly _usersList = signal<User[]>([]);

  /** Usuarios cargados. */
  public readonly users = this._usersList.asReadonly();
  /** Usuario en sesión. */
  public readonly currentUser = this.authStorage.currentUser;

  /** Usuarios con rol de estudiante. */
  public students = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ESTUDIANTE))
  );

  /** Usuarios con rol de docente. */
  public teachers = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.DOCENTE))
  );

  /** Usuarios con rol de asesor. */
  public advisors = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ASESOR))
  );

  constructor() {
    this.LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
  }

  /** Lista actual de usuarios. */
  public getUsersSnapshot(): User[] {
    return this._usersList();
  }

  /** Reemplaza la lista con el resultado de la función. */
  public updateUsersList(mutator: (users: User[]) => User[]): void {
    this._usersList.update(mutator);
  }

  /** Actualiza los datos del usuario en sesión (ej. si el administrador se edita a sí mismo). */
  public updateCurrentUser(mutator: (user: User | null) => User | null): void {
    const actualizado = mutator(this.authStorage.currentUser());
    if (actualizado) this.authStorage.updateUser(actualizado);
  }
}
