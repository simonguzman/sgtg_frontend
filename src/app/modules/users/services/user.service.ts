import { computed, effect, inject, Injectable, untracked } from '@angular/core';
import { Observable } from 'rxjs';

import { UserStorageService } from './user-storage.service';
import { UserApiService } from './user-api.service';
import { UserFormatterService } from './user-formatter.service';

import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storage = inject(UserStorageService);
  private readonly api = inject(UserApiService);
  private readonly formatter = inject(UserFormatterService);
  private readonly authStorage = inject(AuthStorageService);


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

  constructor() {
    // La lista de usuarios viene del backend: se carga al iniciar sesión (o al
    // abrir la aplicación con sesión) y se vacía al cerrarla
    let autenticadoAntes = false;
    effect(() => {
      const autenticado = this.authStorage.isAuthenticated();
      untracked(() => {
        if (autenticado && !autenticadoAntes) this.loadUsers();
        if (!autenticado && autenticadoAntes) this.storage.updateUsersList(() => []);
      });
      autenticadoAntes = autenticado;
    });
  }

  /** Vuelve a cargar la lista de usuarios desde el backend. */
  public loadUsers(): void {
    this.api.loadUsers().subscribe({
      error: error => console.warn('No se pudo cargar la lista de usuarios', error?.status)
    });
  }

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
