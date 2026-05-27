import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { UserStorageService } from './user-storage.service';
import { User, UserState } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class UserMutationService {
  private readonly storage = inject(UserStorageService);

  createUserMock(user: User): Observable<User> {
    const newUser: User = { ...user, id: crypto.randomUUID(), state: UserState.active };
    return of(newUser).pipe(
      delay(1000),
      tap(onSaved => this.storage.updateUsersList(current => [onSaved, ...current]))
    );
  }

  updateUserMock(id: string, changes: Partial<User>): Observable<User> {
    return of(changes as User).pipe(
      delay(800),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(u => u.id === id ? { ...u, ...changes } : u)
        );
        // Sincroniza la sesión activa en caliente si modificó su propio perfil
        if (this.storage.currentUser()?.id === id) {
          this.storage.updateCurrentUser(current => current ? { ...current, ...changes } : null);
        }
      })
    );
  }

  updateUserPasswordMock(userId: string, newPassword: string): void {
    this.storage.updateUsersList(users =>
      users.map(u => u.id === userId ? { ...u, password: newPassword } : u)
    );
  }

  softDeleteUserMock(id: string): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(u =>
            u.id === id
              ? { ...u, state: u.state === UserState.active ? UserState.inactive : UserState.active }
              : u
          )
        );
      })
    );
  }

  updateUserRolesMock(userId: string, newRoles: UserRoleType[]): Observable<void> {
    return of(undefined).pipe(
      delay(500),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(u => u.id === userId ? { ...u, roles: [...newRoles] } : u)
        );
      })
    );
  }

  addRoleToUser(userId: string, role: UserRoleType): void {
    this.storage.updateUsersList(users =>
      users.map(u => {
        if (u.id === userId && !u.roles.includes(role)) {
          return { ...u, roles: [...u.roles, role] };
        }
        return u;
      })
    );
  }

  removeRoleFromUser(userId: string, role: UserRoleType): void {
    this.storage.updateUsersList(users =>
      users.map(u => {
        if (u.id === userId) {
          return { ...u, roles: u.roles.filter(r => r !== role) };
        }
        return u;
      })
    );
  }
}
