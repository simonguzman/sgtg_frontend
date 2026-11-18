import { effect, inject, Injectable, untracked } from '@angular/core';
import { Observable } from 'rxjs';

import { UserStorageService } from './user-storage.service';
import { UserApiService } from './user-api.service';
import { UserFormatterService } from './user-formatter.service';

import { User } from '../interfaces/user.interface';
import { ManagedUser } from '../helpers/user-management.helper';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';

/**
 * Fachada del módulo de usuarios. La lista de usuarios se carga del backend al iniciar sesión (o al abrir la
 * aplicación con sesión) y se vacía al cerrarla.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storage = inject(UserStorageService);
  private readonly api = inject(UserApiService);
  private readonly formatter = inject(UserFormatterService);
  private readonly authStorage = inject(AuthStorageService);

  /** Usuarios cargados. */
  readonly users = this.storage.users;
  /** Usuarios con rol de estudiante. */
  readonly students = this.storage.students;
  /** Usuarios con rol de docente. */
  readonly teachers = this.storage.teachers;
  /** Usuarios con rol de asesor. */
  readonly advisors = this.storage.advisors;

  constructor() {
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

  /** Usuario por id desde el backend. */
  public getUserById(id: string): Observable<User | undefined> {
    return this.api.getUserById(id);
  }

  /** Usuarios que gestiona el usuario de la sesión, con si los puede modificar. */
  public loadManagedUsers(): Observable<ManagedUser[]> {
    return this.api.loadManagedUsers();
  }

  /** Crea un usuario. */
  public createUser(user: User): Observable<User> {
    return this.api.createUser(user);
  }

  /** Actualiza un usuario. */
  public updateUser(id: string, changes: Partial<User>): Observable<User> {
    return this.api.updateUser(id, changes);
  }

  /** Activa o inactiva un usuario según su estado actual; los usuarios no se borran. */
  public softDeleteUser(id: string): Observable<void> {
    return this.api.softDeleteUser(id);
  }

  /** Reemplaza los roles de un usuario. */
  public updateUserRoles(userId: string, newRoles: UserRoleType[]): Observable<void> {
    return this.api.updateUserRoles(userId, newRoles);
  }

  /** Cambia el Comité del departamento del docente indicado. */
  public changeCommittee(userId: string): Observable<User> {
    return this.api.changeCommittee(userId);
  }

  /** Nombre completo de un usuario. */
  public formatFullName(user: User): string {
    return this.formatter.formatFullName(user);
  }

  /** Nombre completo de un usuario por su id, o «No asignado». */
  public getUserFullName(id: string | undefined): string {
    return this.formatter.getUserFullName(id);
  }

  /** Nombres de los estudiantes. */
  public getAuthorsNames(authors: (string | User)[] | undefined): string {
    return this.formatter.getAuthorsNames(authors);
  }
}
