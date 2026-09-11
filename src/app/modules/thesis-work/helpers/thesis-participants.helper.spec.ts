import { collectParticipantIds } from './thesis-participants.helper';
import { Proposal } from '../../proposal/interfaces/proposal.interface';

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

// Utilizamos la fábrica para centralizar el casteo as Proposal, manteniendo
// los bloques de las pruebas 100% limpios de 'any' o 'unknown'.
const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Propuesta Base',
  authors: [],
  director: undefined,
  codirector: undefined,
  advisor: undefined,
  ...overrides
} as Proposal);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('Thesis Participants Helper', () => {
  beforeEach(() => {
    // 🔕 Silenciador preventivo de consola
    // Aunque es una función pura, la protegemos en caso de que en un futuro
    // se le agreguen logs de advertencia por datos corruptos.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // 🧹 Restauramos la consola utilizando mockRestore() para no interferir
    // con posibles configuraciones globales de Jest.
    jest.spyOn(console, 'error').mockRestore();
    jest.spyOn(console, 'warn').mockRestore();
  });

  describe('collectParticipantIds', () => {
    it('debe retornar un arreglo vacío si la propuesta es undefined', () => {
      const result = collectParticipantIds(undefined);
      expect(result).toEqual([]);
    });

    it('debe retornar un arreglo vacío si la propuesta no tiene participantes definidos', () => {
      const emptyProposal = createMockProposal({
        authors: undefined,
        director: undefined,
        codirector: undefined,
        advisor: undefined
      });

      const result = collectParticipantIds(emptyProposal);
      expect(result).toEqual([]);
    });

    it('debe extraer los IDs cuando los autores son únicamente strings', () => {
      const proposal = createMockProposal({
        // @ts-expect-error: En caso de que la interfaz no admita strings directamente, validamos la resiliencia en runtime
        authors: ['user-1', 'user-2']
      });

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('debe extraer los IDs cuando los autores vienen poblados como objetos', () => {
      const proposal = createMockProposal({
        // @ts-expect-error: Tipamos estructuralmente la parte que nos interesa ({ id })
        authors: [{ id: 'user-obj-1' }, { id: 'user-obj-2' }]
      });

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['user-obj-1', 'user-obj-2']);
    });

    it('debe omitir los autores inválidos o nulos de la lista protegiendo la ejecución', () => {
      const proposal = createMockProposal({
        // @ts-expect-error: Inyectamos deliberadamente array contaminado con nulls, undefined y objetos vacíos
        authors: ['valid-1', null, { id: 'valid-2' }, undefined, {}]
      });

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['valid-1', 'valid-2']);
    });

    it('debe extraer correctamente los IDs del director, codirector y asesor', () => {
      const proposal = createMockProposal({
        // @ts-expect-error: Solo mockeamos la propiedad 'id' que usa el helper
        director: { id: 'dir-1' },
        // @ts-expect-error: Solo mockeamos la propiedad 'id'
        codirector: { id: 'codir-1' },
        // @ts-expect-error: Solo mockeamos la propiedad 'id'
        advisor: { id: 'adv-1' }
      });

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['dir-1', 'codir-1', 'adv-1']);
    });

    it('debe extraer todos los IDs de todos los roles combinados correctamente', () => {
      const proposal = createMockProposal({
        // @ts-expect-error: Mezclamos estructuras para evaluar la colección completa
        authors: ['author-1', { id: 'author-2' }],
        // @ts-expect-error: Mock simplificado
        director: { id: 'dir-1' },
        // @ts-expect-error: Mock simplificado
        codirector: { id: 'codir-1' },
        // @ts-expect-error: Mock simplificado
        advisor: { id: 'adv-1' }
      });

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['author-1', 'author-2', 'dir-1', 'codir-1', 'adv-1']);
    });

    it('debe ignorar roles que existan en el objeto pero que no tengan una propiedad "id"', () => {
      const proposal = createMockProposal({
        // @ts-expect-error: Mock simplificado
        authors: ['author-1'],
        // @ts-expect-error: Forzamos un objeto sin 'id' simulando una respuesta incompleta o corrupta de la API
        director: { name: 'Solo Nombre, sin ID' },
        codirector: undefined
      });

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['author-1']);
    });
  });
});
