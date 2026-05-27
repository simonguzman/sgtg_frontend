import { computed, effect, Injectable, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { IdentificationType, User, UserState } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class UserStorageService {
  private readonly USERS_KEY = 'sgtg_users';
  private readonly SESSION_KEY = 'sgtg_current_session';

  private readonly _usersList = signal<User[]>(this.getStoredUsers());
  private readonly _currentUser = signal<User | null>(this.getStoredSession());

  public readonly users = this._usersList.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();

  public students = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ESTUDIANTE))
  );

  public teachers = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.DOCENTE))
  );

  public advisors = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.ASESOR))
  );

  public potentialDirectors = computed(() =>
    this._usersList().filter(user => user.roles.includes(UserRoleType.DOCENTE))
  );

  constructor() {
    // Sincronización automática de Usuarios
    effect(() => {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(this._usersList()));
    });

    // Sincronización automática de Sesión
    effect(() => {
      const session = this._currentUser();
      if (session) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(this.SESSION_KEY);
      }
    });
  }

  public getUsersSnapshot(): User[] {
    return this._usersList();
  }

  public updateUsersList(mutator: (users: User[]) => User[]): void {
    this._usersList.update(mutator);
  }

  public updateCurrentUser(mutator: (user: User | null) => User | null): void {
    this._currentUser.update(mutator);
  }

  public setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
  }

  public getById(id: string): Observable<User | undefined> {
    const user = this._usersList().find(u => u.id === id);
    return of(user).pipe(delay(500));
  }

  private getStoredSession(): User | null {
    const stored = localStorage.getItem(this.SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private getStoredUsers(): User[] {
    const stored = localStorage.getItem(this.USERS_KEY);
    return stored ? JSON.parse(stored) : this.initialUsers;
  }

  private readonly initialUsers: User[] = [
    {
      id: 'admin-001',
      idType: IdentificationType.CC,
      idNumber: 105160129,
      firstName: 'admin',
      lastName: ' del',
      secondLastName: 'sistema',
      codeNumber: 202601,
      roles: [UserRoleType.ADMINISTRADOR],
      email: 'admin@unicauca.edu.co',
      password: 'password123',
      state: UserState.active
    },
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
    {
      id: 'doc-001',
      idType: IdentificationType.CC,
      idNumber: 2001,
      firstName: 'Pablo',
      lastName: 'Mage',
      secondLastName: 'Imbachi',
      codeNumber: 5001,
      roles: [UserRoleType.DOCENTE, UserRoleType.COMITE],
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
      roles: [UserRoleType.DOCENTE, UserRoleType.ASESOR],
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
}
