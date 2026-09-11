import { hasArchiveAccess } from './archived-record-access.helper';
import { ArchivedBaseProposal } from '../interfaces/archived-base-proposal.interface';
import { User } from '../../users/interfaces/user.interface';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

// Reemplazamos SimpleUserRef por un factory que devuelve estrictamente un 'User'
const createMockUser = (id: string, overrides: Partial<User> = {}): User => ({
  id,
  firstName: 'Nombre',
  lastName: 'Apellido',
  email: 'correo@ejemplo.com',
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<ArchivedBaseProposal> = {}): ArchivedBaseProposal => ({
  authors: [],
  ...overrides
} as ArchivedBaseProposal);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('Helper: hasArchiveAccess', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Evaluación de Acceso Global (hasGlobalAccess)', () => {
    it('debería retornar true si tiene acceso global, incluso si la propuesta es undefined', () => {
      expect(hasArchiveAccess(undefined, 'user-123', true)).toBe(true);
    });

    it('debería retornar true si tiene acceso global, incluso si el usuario no tiene relación con el proyecto', () => {
      const proposal = createMockProposal({ director: createMockUser('other-user') });
      expect(hasArchiveAccess(proposal, 'user-123', true)).toBe(true);
    });
  });

  describe('Evaluación de Datos Faltantes (Edge Cases)', () => {
    it('debería retornar false si no hay acceso global y la propuesta es undefined', () => {
      expect(hasArchiveAccess(undefined, 'user-123', false)).toBe(false);
    });

    it('debería retornar false si no hay acceso global y el userId es undefined', () => {
      const proposal = createMockProposal({ director: createMockUser('user-123') });
      expect(hasArchiveAccess(proposal, undefined, false)).toBe(false);
    });
  });

  describe('Evaluación de Roles Locales (Sin acceso global)', () => {
    const userId = 'target-user';

    it('debería retornar true si el usuario es el Director', () => {
      const proposal = createMockProposal({
        director: createMockUser(userId)
      });
      expect(hasArchiveAccess(proposal, userId, false)).toBe(true);
    });

    it('debería retornar true si el usuario es el Codirector', () => {
      const proposal = createMockProposal({
        codirector: createMockUser(userId)
      });
      expect(hasArchiveAccess(proposal, userId, false)).toBe(true);
    });

    it('debería retornar true si el usuario es el Asesor', () => {
      const proposal = createMockProposal({
        advisor: createMockUser(userId)
      });
      expect(hasArchiveAccess(proposal, userId, false)).toBe(true);
    });

    it('debería retornar true si el usuario es uno de los Autores (evaluado por objeto con ID)', () => {
      const proposal = createMockProposal({
        authors: [createMockUser('other-user'), createMockUser(userId)]
      });
      expect(hasArchiveAccess(proposal, userId, false)).toBe(true);
    });

    it('debería retornar true si el usuario es uno de los Autores (evaluado por ID en formato string)', () => {
      const proposal = createMockProposal({
        authors: ['other-user', userId] // Simulando el caso donde authors guarda strings puros
      });
      expect(hasArchiveAccess(proposal, userId, false)).toBe(true);
    });

    it('debería retornar false si el usuario no cumple con ninguno de los roles anteriores', () => {
      const proposal = createMockProposal({
        authors: [createMockUser('author-1')],
        director: createMockUser('dir-1'),
        codirector: createMockUser('codir-1'),
        advisor: createMockUser('adv-1')
      });
      expect(hasArchiveAccess(proposal, userId, false)).toBe(false);
    });
  });
});
