import { Injectable } from '@angular/core';
import { User } from '../../../interfaces/user.interface';
import { UserTableRow } from '../models/users-page.model';
import { UserState } from '../../../enum/user-state.enum';

/**
 * Convierte los usuarios en filas de la tabla. Los dos nombres van en una columna y los dos apellidos en
 * otra; los roles y el perfil (departamento y programa) van en columnas ocultas para que la búsqueda, que
 * ignora tildes y mayúsculas, los encuentre (ej. «sistemas» encuentra el Departamento de Sistemas y la
 * Ingeniería de Sistemas).
 */
@Injectable({ providedIn: 'root' })
export class UsersMapperService {
  /**
   * @param editable false si el gestor solo lo consulta (tiene roles
   *        administrativos y no es el administrador quien gestiona)
   */
  public mapUserToTable(user: User, editable = true): UserTableRow {
    const isInactive = user.state === UserState.inactive;
    let allowed = isInactive
      ? ['activar']
      : ['ver roles asignados', 'ver', 'editar', 'eliminar'];
    if (!editable) allowed = ['ver roles asignados', 'ver'];

    return {
      identificacion: user.idNumber?.toString() || '',
      nombre: [user.firstName, user.secondName].filter(Boolean).join(' '),
      apellidos: [user.lastName, user.secondLastName].filter(Boolean).join(' '),
      estado: isInactive ? 'Inactivo' : 'Activo',
      hiddenRoles: user.roles.join(', '),
      hiddenProfile: [user.department?.name, user.program?.name].filter(Boolean).join(', '),
      allowedActions: allowed,
      originalData: user
    };
  }
}
