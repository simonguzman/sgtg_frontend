import { inject, Injectable } from '@angular/core';
import { UserStorageService } from './user-storage.service';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserFormatterService {
  private readonly storage = inject(UserStorageService);

  /**
   * Toma un objeto de usuario y normaliza el espacio en blanco de sus nombres y apellidos.
   */
  public formatFullName(user: User): string {
    return `${user.firstName} ${user.secondName || ''} ${user.lastName} ${user.secondLastName || ''}`
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Busca un usuario por ID de manera síncrona en los snapshots para formatear su nombre.
   */
  public getUserFullName(id: string | undefined): string {
    if (!id) return 'No asignado';
    const user = this.storage.getUsersSnapshot().find(u => u.id === id);
    return user ? this.formatFullName(user) : id;
  }

  /**
   * Recibe una colección polimórfica (IDs en string u Objetos User) y devuelve una cadena unificada.
   */
  public getAuthorsNames(authors: (string | User)[] | undefined): string {
    if (!authors || authors.length === 0) return 'Sin autores';

    return authors
      .map(author => {
        if (typeof author === 'string') {
          return this.getUserFullName(author);
        }
        return this.formatFullName(author);
      })
      .join(', ');
  }
}
