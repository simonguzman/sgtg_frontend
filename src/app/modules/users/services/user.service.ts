import { computed, inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

// --- Sub-servicios Inyectados ---
import { UserStorageService } from './user-storage.service';
import { UserMutationService } from './user-mutation.service';
import { UserFormatterService } from './user-formatter.service';

import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storage = inject(UserStorageService);
  private readonly mutationService = inject(UserMutationService);
  private readonly formatterService = inject(UserFormatterService);

  readonly users = this.storage.users;
  readonly currentUser = this.storage.currentUser;

  readonly students = this.storage.students;
  readonly teachers = this.storage.teachers;
  readonly advisors = this.storage.advisors;
  readonly potentialDirectors = this.storage.potentialDirectors;

  readonly currentUserFullName = computed(() => {
    const user = this.storage.currentUser();
    if (!user) return 'Invitado';
    return this.formatterService.formatFullName(user);
  });

  readonly currentDirectorName = computed(() => {
    const user = this.storage.currentUser();
    return user ? this.formatterService.formatFullName(user) : 'No identificado';
  });

  public login(user: User): void {
    this.storage.setCurrentUser(user);
  }

  public logout(): void {
    this.storage.setCurrentUser(null);
  }

  public getUserByIdMock(id: string): Observable<User | undefined> {
    return this.storage.getById(id);
  }

  public getAllUsers(): User[] {
    return this.storage.getUsersSnapshot();
  }

  public getUsersByRole(role: UserRoleType): Observable<User[]> {
    const filteredUsers = this.storage.getUsersSnapshot().filter(user => user.roles.includes(role));
    return of(filteredUsers).pipe(delay(400));
  }

  public createUserMock(user: User): Observable<User> {
    return this.mutationService.createUserMock(user);
  }

  public updateUserMock(id: string, changes: Partial<User>): Observable<User> {
    return this.mutationService.updateUserMock(id, changes);
  }

  public updateUserPasswordMock(userId: string, newPassword: string): void {
    this.mutationService.updateUserPasswordMock(userId, newPassword);
  }

  public softDeleteUserMock(id: string): Observable<void> {
    return this.mutationService.softDeleteUserMock(id);
  }

  public updateUserRolesMock(userId: string, newRoles: UserRoleType[]): Observable<void> {
    return this.mutationService.updateUserRolesMock(userId, newRoles);
  }

  public addRoleToUser(userId: string, role: UserRoleType): void {
    this.mutationService.addRoleToUser(userId, role);
  }

  public removeRoleFromUser(userId: string, role: UserRoleType): void {
    this.mutationService.removeRoleFromUser(userId, role);
  }

  public getUserFullName(id: string | undefined): string {
    return this.formatterService.getUserFullName(id);
  }

  public getAuthorsNames(authors: (string | User)[] | undefined): string {
    return this.formatterService.getAuthorsNames(authors);
  }
}
