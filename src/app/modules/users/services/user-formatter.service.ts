import { inject, Injectable } from '@angular/core';
import { UserStorageService } from './user-storage.service';
import { User } from '../interfaces/user.interface';

/** Nombres de los usuarios para mostrar. */
@Injectable({ providedIn: 'root' })
export class UserFormatterService {
  private readonly storage = inject(UserStorageService);

  /** Nombre completo: nombres y apellidos, sin espacios repetidos. */
  public formatFullName(user: User): string {
    return `${user.firstName} ${user.secondName || ''} ${user.lastName} ${user.secondLastName || ''}`
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Nombre completo de un usuario por su id, o «No asignado». */
  public getUserFullName(id: string | undefined): string {
    if (!id) return 'No asignado';
    const user = this.storage.getUsersSnapshot().find(u => u.id === id);
    return user ? this.formatFullName(user) : id;
  }

  /** Nombres de los estudiantes. */
  public getAuthorsNames(authors: (string | User)[] | undefined): string {
    if (!authors || authors.length === 0) return 'Sin autores';
    return authors
      .map(author => (typeof author === 'string' ? this.getUserFullName(author) : this.formatFullName(author)))
      .join(', ');
  }
}
