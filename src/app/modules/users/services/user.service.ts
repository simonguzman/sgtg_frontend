import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { IdentificationType, User, UserState } from '../interfaces/user.interface';
import { delay, Observable, of, tap } from 'rxjs';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Llaves para LocalStorage
  private readonly USERS_KEY = 'sgtg_users';
  private readonly SESSION_KEY = 'sgtg_current_session';

  // Datos iniciales para que la tabla no nazca vacía
  private readonly initialUsers: User[] = [
  // 1. EL USUARIO Administrador ( ADMINISTRADOR )
  {
    id: 'admin-001',
    idType: IdentificationType.CC,
    idNumber: 105160129,
    firstName: 'admin',
    lastName: ' del',
    secondLastName: 'sistema',
    codeNumber: 202601,
    roles: [ UserRoleType.ADMINISTRADOR],
    email: 'admin@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  // 1. EL USUARIO Estudiante ( ESTUDIANTE)
  {
    id: 'user-001',
    idType: IdentificationType.CC,
    idNumber: 1061700000,
    firstName: 'Simón',
    lastName: 'Guzmán',
    secondLastName: 'Anaya',
    codeNumber: 202601,
    roles: [UserRoleType.ESTUDIANTE],
    email: 'simon@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'user-100',
    idType: IdentificationType.CC,
    idNumber: 1061700000,
    firstName: 'Julian',
    secondName: 'David',
    lastName: 'Camacho',
    secondLastName: 'Erazo',
    codeNumber: 20262,
    roles: [UserRoleType.ESTUDIANTE],
    email: 'jda@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'user-200',
    idType: IdentificationType.CC,
    idNumber: 1061700000,
    firstName: 'Santiago',
    lastName: 'Benitez',
    secondLastName: 'Lopez',
    codeNumber: 201412,
    roles: [UserRoleType.ESTUDIANTE],
    email: 'santiago@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },

  // 2. CONSEJO DE FACULTAD
  {
    id: 'user-002',
    idType: IdentificationType.CC,
    idNumber: 1061700001,
    firstName: 'Beatriz',
    lastName: 'Elena',
    secondLastName: 'Vivas',
    codeNumber: 1001,
    roles: [UserRoleType.CONSEJO],
    email: 'bvivas@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },

  // 3. DOCENTES (8 EN TOTAL CON ROLES ESPECIALES)
  {
    id: 'doc-001',
    idType: IdentificationType.CC,
    idNumber: 2001,
    firstName: 'Pablo',
    lastName: 'Mage',
    secondLastName: 'Imbachi',
    codeNumber: 5001,
    roles: [UserRoleType.DOCENTE, UserRoleType.COMITE], // Comité de programa
    email: 'pmage@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'doc-002',
    idType: IdentificationType.CC,
    idNumber: 2002,
    firstName: 'Alejandro',
    lastName: 'Toledo',
    secondLastName: 'Tovar',
    codeNumber: 5002,
    roles: [UserRoleType.DOCENTE, UserRoleType.ASESOR], // Jefe de departamento
    email: 'atoledo@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'doc-003',
    idType: IdentificationType.CC,
    idNumber: 2003,
    firstName: 'Carlos',
    lastName: 'Eduardo',
    secondLastName: 'Ramírez',
    codeNumber: 5003,
    roles: [UserRoleType.DOCENTE, UserRoleType.CODIRECTOR, UserRoleType.JEFE_DEP],
    email: 'ceramirez@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'doc-004',
    idType: IdentificationType.CC,
    idNumber: 2004,
    firstName: 'Martha',
    lastName: 'Cecilia',
    secondLastName: 'Gómez',
    codeNumber: 5004,
    roles: [UserRoleType.DOCENTE, UserRoleType.JURADO],
    email: 'mgomez@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'doc-005',
    idType: IdentificationType.CC,
    idNumber: 2005,
    firstName: 'Hugo',
    lastName: 'Armando',
    secondLastName: 'Ordoñez',
    codeNumber: 5005,
    roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR, UserRoleType.EVALUADOR],
    email: 'hugo@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'doc-006',
    idType: IdentificationType.CC,
    idNumber: 2006,
    firstName: 'Libardo',
    lastName: 'Pantoja',
    secondLastName: 'Yépez',
    codeNumber: 5006,
    roles: [UserRoleType.DOCENTE, UserRoleType.ASESOR],
    email: 'lpantoja@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'doc-007',
    idType: IdentificationType.CC,
    idNumber: 2007,
    firstName: 'Francisco',
    lastName: 'Pino',
    secondLastName: 'Correa',
    codeNumber: 5007,
    roles: [UserRoleType.DOCENTE, UserRoleType.JURADO],
    email: 'fpino@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'doc-008',
    idType: IdentificationType.CC,
    idNumber: 2008,
    firstName: 'Gustavo',
    lastName: 'Ramírez',
    secondLastName: 'González',
    codeNumber: 5008,
    roles: [UserRoleType.DOCENTE, UserRoleType.CODIRECTOR],
    email: 'gramirez@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'user-456',
    idType: IdentificationType.CC,
    idNumber: 1061700002,
    firstName: 'Usuario',
    lastName: 'De',
    secondLastName: 'Decanatura',
    codeNumber: 202602,
    roles: [UserRoleType.DECANATURA],
    email: 'deca@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },

  // 4. ESTUDIANTES ADICIONALES (5 EN TOTAL)
  {
    id: 'user-456',
    idType: IdentificationType.CC,
    idNumber: 1061700002,
    firstName: 'Juan',
    lastName: 'Pérez',
    secondLastName: 'López',
    codeNumber: 202602,
    roles: [UserRoleType.ESTUDIANTE],
    email: 'jperez@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'user-003',
    idType: IdentificationType.CC,
    idNumber: 1061700003,
    firstName: 'María',
    lastName: 'Fernanda',
    secondLastName: 'Rojas',
    codeNumber: 202603,
    roles: [UserRoleType.ESTUDIANTE],
    email: 'mafe@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'user-004',
    idType: IdentificationType.CC,
    idNumber: 1061700004,
    firstName: 'Andrés',
    lastName: 'Felipe',
    secondLastName: 'Caldas',
    codeNumber: 202604,
    roles: [UserRoleType.ESTUDIANTE],
    email: 'afcaldas@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  },
  {
    id: 'user-005',
    idType: IdentificationType.CC,
    idNumber: 1061700005,
    firstName: 'Camila',
    lastName: 'Andrea',
    secondLastName: 'Suárez',
    codeNumber: 202605,
    roles: [UserRoleType.ESTUDIANTE],
    email: 'camilas@unicauca.edu.co',
    password: 'password123',
    state: UserState.active
  }
];

  // --- SIGNALS DE ESTADO ---

  // 1. Lista global de usuarios
  private readonly _usersList = signal<User[]>(this.getStoredUsers());
  public users = this._usersList.asReadonly();

  // 2. Sesión activa (Usuario logueado)
  private _currentUser = signal<User | null>(this.getStoredSession());
  public currentUser = this._currentUser.asReadonly();

  constructor() {
    // Sincronización automática con LocalStorage cada vez que cambien los signals
    effect(() => {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(this._usersList()));
    });

    effect(() => {
      const session = this._currentUser();
      if (session) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(this.SESSION_KEY);
      }
    });
  }

  // --- GESTIÓN DE SESIÓN ---

  private getStoredSession(): User | null {
    const stored = localStorage.getItem(this.SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Define quién es el usuario que está operando el sistema.
   * En un login real, esto vendría del backend.
   */
  public login(user: User): void {
    this._currentUser.set(user);
  }

  public logout(): void {
    this._currentUser.set(null);
  }

  // --- GESTIÓN DE USUARIOS (LocalStorage) ---

  private getStoredUsers(): User[] {
    const stored = localStorage.getItem(this.USERS_KEY);
    return stored ? JSON.parse(stored) : this.initialUsers;
  }

  // --- SELECTORES COMPUTADOS ---

  public students = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ESTUDIANTE))
  );

  public teachers = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.DOCENTE))
  );

  public advisors = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ASESOR))
  );

  // Selector para obtener el nombre del director actual de forma reactiva
  public currentDirectorName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.firstName} ${user.lastName} ${user.secondLastName || ''}`.trim() : 'No identificado';
  });

  // --- MÉTODOS DE UTILIDAD ---


  // --- MÉTODOS MOCK (Persistencia en Signal) ---

  createUserMock(user: User): Observable<User> {
    const newUser: User = { ...user, id: crypto.randomUUID(), state: UserState.active };
    return of(newUser).pipe(
      delay(1000),
      tap(onSaved => this._usersList.update(current => [onSaved, ...current]))
    );
  }

  updateUserMock(id: string, changes: Partial<User>): Observable<User> {
    return of(changes as User).pipe(
      delay(800),
      tap(() => {
        this._usersList.update(users =>
          users.map(user => user.id === id ? { ...user, ...changes } : user)
        );
        // Si el usuario editado es el mismo de la sesión, actualizamos la sesión también
        if (this._currentUser()?.id === id) {
          this._currentUser.update(currentUser => currentUser ? { ...currentUser, ...changes } : null);
        }
      })
    );
  }

  updateUserPasswordMock(userId: string, newPassword: string): void {
    this._usersList.update(users =>
      users.map(user => user.id === userId ? { ...user, password: newPassword } : user)
    );
  }

  softDeleteUserMock(id: string): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        this._usersList.update(users =>
          users.map(user =>
            user.id === id
              ? { ...user, state: user.state === UserState.active ? UserState.inactive : UserState.active }
              : user
          )
        );
      })
    );
  }

  updateUserRolesMock(userId: string, newRoles: UserRoleType[]): Observable<void> {
    return of(undefined).pipe(
      delay(500),
      tap(() => {
        this._usersList.update(users =>
          users.map(user => user.id === userId ? { ...user, roles: [...newRoles] } : user)
        );
      })
    );
  }

  getUserByIdMock(id: string): Observable<User | undefined> {
    const user = this._usersList().find(user => user.id === id);
    return of(user).pipe(delay(500));
  }

  // Un docente puede ser Director, Codirector o Asesor
  public potentialDirectors = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.DOCENTE))
  );

  public currentUserFullName = computed(() => {
    const user = this._currentUser();
    if (!user) return 'Invitado';
    return this.formatFullName(user);
  });

// Método privado para estandarizar el formato en todo el servicio
  private formatFullName(user: User): string {
    return `${user.firstName} ${user.secondName || ''} ${user.lastName} ${user.secondLastName || ''}`
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Y actualizamos tu getUserFullName original para usar el estandarizador:
  getUserFullName(id: string | undefined): string {
    if(!id) return 'No asignado';
    const user = this._usersList().find(user => user.id === id);
    return user ? this.formatFullName(user) : id;
  }

  getAuthorsNames(authors: (string | User)[] | undefined): string {
    if (!authors || authors.length === 0) return 'Sin autores';

    return authors
      .map(author => {
        // Si viene como string (id)
        if (typeof author === 'string') {
          return this.getUserFullName(author);
        }

        // Si viene como objeto User
        return this.formatFullName(author);
      })
      .join(', ');
  }

  getAllUsers(): User[] {
    return [...this._usersList()];
  }

  addRoleToUser(userId: string, role: UserRoleType): void {
    this._usersList.update(users =>
      users.map(user => {
        if (user.id === userId && !user.roles.includes(role)) {
          return { ...user, roles: [...user.roles, role] };
        }
        return user;
      })
    );
  }

  removeRoleFromUser(userId: string, role: UserRoleType): void {
    this._usersList.update(users =>
      users.map(user => {
        if (user.id === userId) {
          return { ...user, roles: user.roles.filter(userRole => userRole !== role) };
        }
        return user;
      })
    );
  }

  getUsersByRole(role: UserRoleType): Observable<User[]> {
    const filteredUsers = this._usersList().filter(user => user.roles.includes(role));
    return of(filteredUsers).pipe(delay(400)); // Simula un retraso de red de 400ms
  }

}
