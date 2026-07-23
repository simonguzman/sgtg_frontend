import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { UserStorageService } from './user-storage.service';
import { UserApiService } from './user-api.service';
import { UserFormatterService } from './user-formatter.service';

import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storage = inject(UserStorageService);
  private readonly api = inject(UserApiService);
  private readonly formatter = inject(UserFormatterService);


  // ==========================================
  // ESTADO REACTIVO
  // ==========================================
  readonly users = this.storage.users;
  readonly currentUser = this.storage.currentUser;
  readonly students = this.storage.students;
  readonly teachers = this.storage.teachers;
  readonly advisors = this.storage.advisors;
  readonly potentialDirectors = this.storage.potentialDirectors;

  readonly currentUserFullName = computed(() => {
    const user = this.storage.currentUser();
    return user ? this.formatter.formatFullName(user) : 'Invitado';
  });

  readonly currentDirectorName = computed(() => {
    const user = this.storage.currentUser();
    return user ? this.formatter.formatFullName(user) : 'No identificado';
  });

  // ==========================================
  // SESIÓN
  // ==========================================
  public login(user: User): void {
    this.storage.setCurrentUser(user);
  }

  public logout(): void {
    this.storage.setCurrentUser(null);
  }

  // ==========================================
  // QUERIES — nombres originales conservados
  // ==========================================

  /** Acceso síncrono a todos los usuarios. Alias de getUsersSnapshot para compatibilidad. */
  public getAllUsers(): User[] {
    return this.storage.getUsersSnapshot();
  }

  /** Alias síncrono de getUsersSnapshot para módulos que lo llaman directamente. */
  public getUsersSnapshot(): User[] {
    return this.storage.getUsersSnapshot();
  }

  /** Alias con sufijo Mock para compatibilidad con callers existentes. */
  public getUserByIdMock(id: string): Observable<User | undefined> {
    return this.api.getUserById(id);
  }

  public getUsersByRole(role: UserRoleType): Observable<User[]> {
    return this.api.getUsersByRole(role);
  }

  // ==========================================
  // MUTATIONS — nombres originales conservados
  // ==========================================

  public createUserMock(user: User): Observable<User> {
    return this.api.createUser(user);
  }

  public updateUserMock(id: string, changes: Partial<User>): Observable<User> {
    return this.api.updateUser(id, changes);
  }

  public updateUserPasswordMock(userId: string, newPassword: string): Observable<void> {
    return this.api.updateUserPassword(userId, newPassword);
  }

  public softDeleteUserMock(id: string): Observable<void> {
    return this.api.softDeleteUser(id);
  }

  public updateUserRolesMock(userId: string, newRoles: UserRoleType[]): Observable<void> {
    return this.api.updateUserRoles(userId, newRoles);
  }

  public addRoleToUser(userId: string, role: UserRoleType): Observable<void> {
    return this.api.addRoleToUser(userId, role);
  }

  public removeRoleFromUser(userId: string, role: UserRoleType): Observable<void> {
    return this.api.removeRoleFromUser(userId, role);
  }

  public removeRolesFromUsersMock(userIds: string[], rolesToRemove: UserRoleType[]): Observable<void> {
    return this.api.removeRolesFromUsers(userIds, rolesToRemove);
  }

  // ==========================================
  // FORMATO
  // ==========================================
  public formatFullName(user: User): string {
    return this.formatter.formatFullName(user);
  }

  public getUserFullName(id: string | undefined): string {
    return this.formatter.getUserFullName(id);
  }

  public getAuthorsNames(authors: (string | User)[] | undefined): string {
    return this.formatter.getAuthorsNames(authors);
  }
}
