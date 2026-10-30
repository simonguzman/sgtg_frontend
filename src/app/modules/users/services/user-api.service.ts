import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../interfaces/user.interface';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserStorageService } from './user-storage.service';
import { UsuarioGestionadoResponse, UsuarioResponse } from '../../../core/interfaces/api/auth-api.interface';
import { ManagedUser } from '../helpers/user-management.helper';
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

  /**
   * Usuarios que gestiona el usuario de la sesión (administrador, Comité, jefe
   * de departamento, Consejo o Decanatura), con su documento y si los puede modificar.
   */
  loadManagedUsers(): Observable<ManagedUser[]> {
    return this.http.get<UsuarioGestionadoResponse[]>(`${this.apiUrl}/gestion`).pipe(
      map(lista => lista.map(({ usuario, modificable }) => ({ user: mapUsuarioToUser(usuario), editable: modificable })))
    );
  }

  /** Consulta un usuario del alcance del gestor; undefined si no existe. */
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
