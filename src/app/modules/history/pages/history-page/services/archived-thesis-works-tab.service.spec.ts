import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ArchivedThesisWorksTabService } from './archived-thesis-works-tab.service';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { ThesisWork } from '../../../../thesis-work/interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { ARCHIVED_ALLOWED_ACTIONS } from '../models/archived-tab-columns.model';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Utilidad de Tipado Profundo (Zero-Any) ───────────────────────────────────
// Convierte recursivamente todas las propiedades de una interfaz en opcionales.
// Esto elimina el error TS2740 al permitirnos mockear objetos profundamente anidados
// (como proposalData dentro de preliminaryDraftData) sin exigir la interfaz completa.
type DeepPartialMock<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartialMock<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartialMock<U>>
    : T[P] extends Date
    ? Date
    : T[P] extends object
    ? DeepPartialMock<T[P]>
    : T[P];
};

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-default',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    ...overrides
  } as User;
}

function createMockThesisWork(overrides: DeepPartialMock<ThesisWork> = {}): ThesisWork {
  return {
    thesisWorkId: 'tw-1',
    // Usamos 'as never' para inyectar el string burlando la validación del Enum,
    // garantizando que no se dispare el error TS2339 y cumpliendo la regla de 0 "any".
    state: 'FINALIZADO' as never,
    isArchived: true,
    ...overrides
  } as ThesisWork;
}

describe('ArchivedThesisWorksTabService', () => {
  let service: ArchivedThesisWorksTabService;

  // Mocks de dependencias
  let mockThesisWorkService: { allThesisWorks: WritableSignal<ThesisWork[]> };
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    mockThesisWorkService = {
      allThesisWorks: signal<ThesisWork[]>([])
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Autores Mockeados'),
    } as Partial<UserService> as jest.Mocked<UserService>;

    TestBed.configureTestingModule({
      providers: [
        ArchivedThesisWorksTabService,
        { provide: ThesisWorkService, useValue: mockThesisWorkService },
        { provide: UserService, useValue: mockUserService },
      ],
    });

    service = TestBed.inject(ArchivedThesisWorksTabService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuración Básica', () => {
    it('debería instanciarse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener el tabValue correcto', () => {
      expect(service.tabValue).toBe('TRABAJOS');
    });

    it('debería definir la estructura de las columnas usando el builder', () => {
      expect(service.columns).toBeDefined();
      expect(service.columns.length).toBeGreaterThan(0);
    });
  });

  describe('getTableData() - Lógica de Filtrado y Mapeo', () => {
    const createContext = (userId: string, hasGlobalAccess = false): HistoryEvaluationContext => ({
      currentUser: createMockUser({ id: userId }),
      hasGlobalAccess,
    });

    it('debería excluir los trabajos de grado que NO están archivados (isArchived = false)', () => {
      // Asignamos a 'user-123' como autor en ambos trabajos para pasar el filtro de permisos locales
      // y así poder probar exclusivamente si la bandera 'isArchived' los filtra correctamente.
      const activeWork = createMockThesisWork({
        thesisWorkId: 'tw-active-1',
        isArchived: false,
        preliminaryDraftData: { proposalData: { authors: [createMockUser({ id: 'user-123' })] } }
      });

      const archivedWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        isArchived: true,
        preliminaryDraftData: { proposalData: { authors: [createMockUser({ id: 'user-123' })] } }
      });

      mockThesisWorkService.allThesisWorks.set([activeWork, archivedWork]);

      const context = createContext('user-123'); // Acceso global es false
      const data = service.getTableData(context);

      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('tw-arch-1');
    });

    it('debería retornar TODOS los trabajos archivados si el contexto tiene acceso global', () => {
      const workPropio = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        preliminaryDraftData: { proposalData: { authors: [createMockUser({ id: 'user-admin' })] } }
      });
      const workAjeno = createMockThesisWork({
        thesisWorkId: 'tw-arch-2',
        preliminaryDraftData: { proposalData: { authors: [createMockUser({ id: 'user-other' })] } }
      });

      mockThesisWorkService.allThesisWorks.set([workPropio, workAjeno]);

      const context = createContext('user-admin', true);
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);
    });

    it('debería mapear correctamente las columnas y procesar la fecha máxima de entrega dinámicamente', () => {
      const fullWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        state: 'FINALIZADO' as never,
        preliminaryDraftData: {
          maximumDeliveryDate: new Date('2026-12-31T10:00:00'),
          proposalData: {
            title: 'Sistema de Gestión Tesis',
            modality: Modality.TI, // <-- Utilizamos Modality dinámico y strict typing
            description: 'Descripción del trabajo de grado',
            authors: [createMockUser({ id: 'user-123' })],
          }
        }
      });

      const emptyWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-3',
        state: 'CANCELADO' as never,
        preliminaryDraftData: {
          proposalData: {
            authors: [createMockUser({ id: 'user-123' })]
          }
        }
      });

      mockThesisWorkService.allThesisWorks.set([fullWork, emptyWork]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificación del caso feliz (Full Work)
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'tw-arch-1',
        title: 'Sistema de Gestión Tesis',
        modality: Modality.TI,
        authors: 'Autores Mockeados',
        description: 'Descripción del trabajo de grado',
        state: 'FINALIZADO',
        allowedActions: ARCHIVED_ALLOWED_ACTIONS,
      }));

      // Comprobamos la generación del string para la fecha formateada
      expect(typeof data[0]['maxDeliveryDate']).toBe('string');
      expect(data[0]['maxDeliveryDate']).not.toBe('Sin fecha límite');

      // Verificación de Fallbacks (Tu Fix trabajando de fondo)
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'tw-arch-3',
        title: 'Sin título',
        modality: 'No definida',
        description: 'Sin descripción',
        maxDeliveryDate: 'Sin fecha límite',
      }));
    });
  });
});
