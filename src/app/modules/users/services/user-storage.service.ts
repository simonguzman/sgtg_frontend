import { computed, inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';

@Injectable({
  providedIn: 'root'
})
export class UserStorageService {
  /** Claves de los datos simulados anteriores; se eliminan porque ahora vienen del backend */
  private readonly LEGACY_KEYS = ['sgtg_users', 'sgtg_current_session'];
  // La sesión es única: la del usuario autenticado contra el backend
  private readonly authStorage = inject(AuthStorageService);

  /** Usuarios del backend; los carga `UserService` al iniciar sesión */
  private readonly _usersList = signal<User[]>([]);

  public readonly users = this._usersList.asReadonly();
  public readonly currentUser = this.authStorage.currentUser;

  public students = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ESTUDIANTE))
  );

  public teachers = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.DOCENTE))
  );

  public advisors = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ASESOR))
  );

  public potentialDirectors = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.DOCENTE))
  );

  constructor() {
    this.LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
  }

  public getUsersSnapshot(): User[] {
    return this._usersList();
  }

  public updateUsersList(mutator: (users: User[]) => User[]): void {
    this._usersList.update(mutator);
  }

  /** Actualiza los datos del usuario en sesión (ej. si el administrador se edita a sí mismo). */
  public updateCurrentUser(mutator: (user: User | null) => User | null): void {
    const actualizado = mutator(this.authStorage.currentUser());
    if (actualizado) this.authStorage.updateUser(actualizado);
  }

  /** Reemplaza el usuario en sesión; con null cierra la sesión. */
  public setCurrentUser(user: User | null): void {
    if (user) this.authStorage.updateUser(user);
    else this.authStorage.clearUser();
  }

  public getById(id: string): Observable<User | undefined> {
    const user = this._usersList().find(u => u.id === id);
    return of(user).pipe(delay(500));
  }

}
