import { computed, effect, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { USER_LIST } from '../mocks/users.mock';

@Injectable({
  providedIn: 'root'
})
export class UserStorageService {
  private readonly USERS_KEY = 'sgtg_users';
  private readonly SESSION_KEY = 'sgtg_current_session';

  private readonly initialUsers = USER_LIST;
  private readonly _usersList = signal<User[]>(this.getStoredUsers());
  private readonly _currentUser = signal<User | null>(this.getStoredSession());

  public readonly users = this._usersList.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();

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
    // Sincronización automática de Usuarios
    effect(() => {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(this._usersList()));
    });

    // Sincronización automática de Sesión
    effect(() => {
      const session = this._currentUser();
      if (session) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }
    });
  }

  public getUsersSnapshot(): User[] {
    return this._usersList();
  }

  public updateUsersList(mutator: (users: User[]) => User[]): void {
    this._usersList.update(mutator);
  }

  public updateCurrentUser(mutator: (user: User | null) => User | null): void {
    this._currentUser.update(mutator);
  }

  public setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
  }

  public getById(id: string): Observable<User | undefined> {
    const user = this._usersList().find(u => u.id === id);
    return of(user).pipe(delay(500));
  }

  private getStoredSession(): User | null {
    const stored = localStorage.getItem(this.SESSION_KEY);

    if (!stored || stored === 'undefined') {
      return null;
    }

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(this.SESSION_KEY);
      return null;
    }
  }

  private getStoredUsers(): User[] {
    const stored = localStorage.getItem(this.USERS_KEY);

    if (!stored || stored === 'undefined') {
      return this.initialUsers;
    }

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(this.USERS_KEY);
      return this.initialUsers;
    }
  }
}
