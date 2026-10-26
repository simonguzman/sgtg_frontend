
import { Column, TableButton } from "../../../../../shared/components/table-component/table-component.component";
import { User } from "../../../interfaces/user.interface";

export interface UserTableRow {
  identificacion: string;
  nombre: string;
  apellidos: string;
  estado: string;
  /** Roles del usuario, solo para la búsqueda de la tabla (no es una columna) */
  hiddenRoles: string;
  /**
   * Departamento (perfil docente) y programa (perfil de estudiante) del
   * usuario, solo para la búsqueda de la tabla (no es una columna)
   */
  hiddenProfile: string;
  allowedActions: string[];
  originalData: User;
}

export const USER_COLUMNS: Column[] = [
  { field: 'identificacion', header: 'Identificación', type: 'text', width: '15%' },
  { field: 'nombre', header: 'Nombres', type: 'text', width: '15%' },
  { field: 'apellidos', header: 'Apellidos', type: 'text', width: '15%' },
  { field: 'estado', header: 'Estado', type: 'text', width: '15%' },
  {
    field: 'roles',
    header: 'Descripción',
    type: 'actions',
    width: '20%',
    actions: [
      { action: 'ver roles asignados', label: 'Ver roles asignados', variant: 'primary', disabled: false }
    ]
  },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    width: '20%',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar', icon: 'edit', variant: 'primary', disabled: false },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: false },
      { action: 'activar', icon: 'person_check', variant: 'primary', disabled: false }
    ]
  },
];

/**
 * Campos que recorre la búsqueda de la tabla: las columnas de texto, los roles,
 * el departamento y el programa.
 */
export const USER_FILTER_FIELDS = ['identificacion', 'nombre', 'apellidos', 'estado', 'hiddenRoles', 'hiddenProfile'];

export const USER_HEADER_BUTTONS: TableButton[] = [
  { label: 'Crear usuarios', variant: 'primary' }
];
