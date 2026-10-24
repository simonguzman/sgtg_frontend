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
      // La búsqueda ignora tildes y mayúsculas: "comite" encuentra "Comité del programa"
      hiddenRoles: user.roles.join(', '),
      // "sistemas" encuentra a los docentes del Departamento de Sistemas y a los estudiantes de Ingeniería de Sistemas
      hiddenProfile: [user.department?.name, user.program?.name].filter(Boolean).join(', '),
      allowedActions: allowed,
      originalData: user
    };
  }
}
