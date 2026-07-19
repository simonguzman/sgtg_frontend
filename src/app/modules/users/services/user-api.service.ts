import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserStorageService } from './user-storage.service';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly storage = inject(UserStorageService);

  // ==========================================
  // QUERIES
  // ==========================================

  getUserById(id: string): Observable<User | undefined> {
    return this.storage.getById(id);
  }

  getUsersByRole(role: UserRoleType): Observable<User[]> {
    const filteredUsers = this.storage.getUsersSnapshot().filter(u => u.roles.includes(role));
    return of(filteredUsers).pipe(delay(400));
  }

  // ==========================================
  // MUTATIONS
  // ==========================================

  createUser(user: User): Observable<User> {
    const newUser: User = { ...user, id: crypto.randomUUID(), state: UserState.active };
    return of(newUser).pipe(
      delay(1000),
      tap(saved => this.storage.updateUsersList(current => [saved, ...current]))
    );
  }

  updateUser(id: string, changes: Partial<User>): Observable<User> {
    return of(changes as User).pipe(
      delay(800),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(user => user.id === id ? { ...user, ...changes } : user)
        );
        if (this.storage.currentUser()?.id === id) {
          this.storage.updateCurrentUser(current => current ? { ...current, ...changes } : null);
        }
      })
    );
  }

  // ← NUEVO: faltaba en UserApiService, existía en UserMutationService
  updateUserPassword(userId: string, newPassword: string): Observable<void> {
    return of(undefined).pipe(
      delay(600),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(user => user.id === userId ? { ...user, password: newPassword } : user)
        );
      })
    );
  }

  softDeleteUser(id: string): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(user =>
            user.id === id
              ? { ...user, state: user.state === UserState.active ? UserState.inactive : UserState.active }
              : user
          )
        );
      })
    );
  }

  updateUserRoles(userId: string, newRoles: UserRoleType[]): Observable<void> {
    return of(undefined).pipe(
      delay(500),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(user => user.id === userId ? { ...user, roles: [...newRoles] } : user)
        );
      })
    );
  }

  // ← NUEVO: faltaba en UserApiService, existía en UserMutationService
  addRoleToUser(userId: string, role: UserRoleType): Observable<void> {
    return of(undefined).pipe(
      delay(500),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(user => {
            if (user.id === userId && !user.roles.includes(role)) {
              return { ...user, roles: [...user.roles, role] };
            }
            return user;
          })
        );
      })
    );
  }

  // ← NUEVO: faltaba en UserApiService, existía en UserMutationService
  removeRoleFromUser(userId: string, role: UserRoleType): Observable<void> {
    return of(undefined).pipe(
      delay(500),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(user => {
            if (user.id === userId) {
              return { ...user, roles: user.roles.filter(r => r !== role) };
            }
            return user;
          })
        );
      })
    );
  }

  // ← NUEVO: faltaba en UserApiService, existía en UserMutationService
  removeRolesFromUsers(userIds: string[], rolesToRemove: UserRoleType[]): Observable<void> {
    return of(undefined).pipe(
      delay(600),
      tap(() => {
        this.storage.updateUsersList(users =>
          users.map(user => {
            if (userIds.includes(user.id)) {
              return { ...user, roles: user.roles.filter(role => !rolesToRemove.includes(role)) };
            }
            return user;
          })
        );
        const currentUser = this.storage.currentUser();
        if (currentUser && userIds.includes(currentUser.id)) {
          this.storage.updateCurrentUser(current => {
            if (!current) return null;
            return { ...current, roles: current.roles.filter(role => !rolesToRemove.includes(role)) };
          });
        }
      })
    );
  }
}
