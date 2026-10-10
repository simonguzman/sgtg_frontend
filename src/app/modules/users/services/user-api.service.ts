import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../interfaces/user.interface';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserStorageService } from './user-storage.service';
import { UsuarioResponse } from '../../../core/interfaces/api/auth-api.interface';
import { aClaveDeRol, mapUserToUsuarioRequest, mapUsuarioToUser } from '../../../core/mappers/usuario.mapper';

/**
 * Llamadas al backend de administración de usuarios (`/usuarios`). Cada
 * respuesta actualiza la lista de usuarios en memoria (`UserStorageService`),
 * que es la que leen las pantallas y los demás módulos.
 */
@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(UserStorageService);
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  // ==========================================
  // QUERIES
  // ==========================================

  /** Carga todos los usuarios del backend en la lista en memoria. */
  loadUsers(): Observable<User[]> {
    return this.http.get<UsuarioResponse[]>(this.apiUrl).pipe(
      map(lista => lista.map(mapUsuarioToUser)),
      tap(users => this.storage.updateUsersList(() => users))
    );
  }

  /** Consulta un usuario (solo administrador); undefined si no existe. */
  getUserById(id: string): Observable<User | undefined> {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/${id}`).pipe(
      map(mapUsuarioToUser),
      tap(user => this.replaceInList(user)),
      catchError((error: HttpErrorResponse) => error.status === 404 ? of(undefined) : throwError(() => error))
    );
  }

  getUsersByRole(role: UserRoleType): Observable<User[]> {
    return of(this.storage.getUsersSnapshot().filter(u => u.roles.includes(role)));
  }

  // ==========================================
  // MUTATIONS
  // ==========================================

  /** Crea el usuario con su perfil (la vinculación se deduce de los roles). */
  createUser(user: User): Observable<User> {
    return this.http.post<UsuarioResponse>(this.apiUrl, mapUserToUsuarioRequest(user)).pipe(
      map(mapUsuarioToUser),
      tap(saved => this.storage.updateUsersList(current => [...current, saved]))
    );
  }

  /**
   * Actualiza datos, roles y perfil. Se envía el usuario completo (el actual
   * con los cambios); una contraseña vacía conserva la actual.
   */
  updateUser(id: string, changes: Partial<User>): Observable<User> {
    const current = this.storage.getUsersSnapshot().find(user => user.id === id);
    const merged = { ...current, ...changes } as User;
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/${id}`, mapUserToUsuarioRequest(merged)).pipe(
      map(mapUsuarioToUser),
      tap(saved => this.replaceInList(saved))
    );
  }

  /** Activa al usuario si está inactivo y lo inactiva si está activo. */
  softDeleteUser(id: string): Observable<void> {
    const user = this.storage.getUsersSnapshot().find(u => u.id === id);
    const activo = user?.state !== UserState.active;
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/${id}/estado`, { activo }).pipe(
      tap(saved => this.replaceInList(mapUsuarioToUser(saved))),
      map(() => undefined)
    );
  }

  updateUserRoles(userId: string, newRoles: UserRoleType[]): Observable<void> {
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/${userId}/roles`, { roles: newRoles.map(aClaveDeRol) }).pipe(
      tap(saved => this.replaceInList(mapUsuarioToUser(saved))),
      map(() => undefined)
    );
  }

  // ==========================================
  // ROLES AUTOMÁTICOS (solo en memoria)
  // ==========================================
  // Los usan los flujos simulados de propuestas, anteproyectos y trabajos de
  // grado para reflejar roles que se ganan o pierden (director, evaluador…).
  // Solo cambian la lista en memoria: el backend no permite que esos usuarios
  // cambien roles, y al integrar esos módulos el backend asignará los roles.

  addRoleToUser(userId: string, role: UserRoleType): Observable<void> {
    return this.enMemoria(users =>
      users.map(user => user.id === userId && !user.roles.includes(role)
        ? { ...user, roles: [...user.roles, role] }
        : user));
  }

  removeRoleFromUser(userId: string, role: UserRoleType): Observable<void> {
    return this.enMemoria(users =>
      users.map(user => user.id === userId ? { ...user, roles: user.roles.filter(r => r !== role) } : user));
  }

  removeRolesFromUsers(userIds: string[], rolesToRemove: UserRoleType[]): Observable<void> {
    return this.enMemoria(users =>
      users.map(user => userIds.includes(user.id)
        ? { ...user, roles: user.roles.filter(role => !rolesToRemove.includes(role)) }
        : user)).pipe(tap(() => {
      // Como antes: si el usuario de la sesión pierde el rol, deja de ver sus opciones
      const currentUser = this.storage.currentUser();
      if (currentUser && userIds.includes(currentUser.id)) {
        this.storage.updateCurrentUser(current => current
          ? { ...current, roles: current.roles.filter(role => !rolesToRemove.includes(role)) }
          : null);
      }
    }));
  }

  /** Aplica el cambio a la lista al suscribirse (como antes, cuando era una llamada simulada). */
  private enMemoria(mutator: (users: User[]) => User[]): Observable<void> {
    return defer(() => {
      this.storage.updateUsersList(mutator);
      return of(undefined);
    });
  }

  /** Reemplaza el usuario en la lista y, si es el de la sesión, también en la sesión. */
  private replaceInList(saved: User): void {
    this.storage.updateUsersList(users => users.some(user => user.id === saved.id)
      ? users.map(user => user.id === saved.id ? saved : user)
      : [...users, saved]);
    if (this.storage.currentUser()?.id === saved.id) {
      this.storage.updateCurrentUser(() => saved);
    }
  }
}
