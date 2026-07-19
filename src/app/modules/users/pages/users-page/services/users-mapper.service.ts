import { Injectable } from '@angular/core';
import { User } from '../../../interfaces/user.interface';
import { UserTableRow } from '../models/users-page.model';
import { UserState } from '../../../enum/user-state.enum';

@Injectable({ providedIn: 'root' })
export class UsersMapperService {

  public mapUserToTable(user: User): UserTableRow {
    const isInactive = user.state === UserState.inactive;
    const allowed = isInactive
      ? ['activar']
      : ['ver roles asignados', 'ver', 'editar', 'eliminar'];

    return {
      identificacion: user.idNumber?.toString() || '',
      nombre: user.firstName,
      apellidos: `${user.lastName} ${user.secondLastName || ''}`,
      estado: isInactive ? 'Inactivo' : 'Activo',
      allowedActions: allowed,
      originalData: user
    };
  }
}
