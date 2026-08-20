import { collectParticipantIds } from './thesis-participants.helper';
import { Proposal } from '../../proposal/interfaces/proposal.interface';

describe('Thesis Participants Helper', () => {
  describe('collectParticipantIds', () => {
    it('Debe retornar un arreglo vacío si la propuesta es undefined', () => {
      const result = collectParticipantIds(undefined);
      expect(result).toEqual([]);
    });

    it('Debe retornar un arreglo vacío si la propuesta no tiene participantes definidos', () => {
      // Usamos 'as unknown as Proposal' para simular un objeto vacío sin usar 'any'
      const emptyProposal = {} as unknown as Proposal;
      const result = collectParticipantIds(emptyProposal);

      expect(result).toEqual([]);
    });

    it('Debe extraer los IDs cuando los autores son únicamente strings', () => {
      const proposal = {
        authors: ['user-1', 'user-2'],
      } as unknown as Proposal;

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('Debe extraer los IDs cuando los autores vienen poblados como objetos', () => {
      const proposal = {
        authors: [{ id: 'user-obj-1' }, { id: 'user-obj-2' }],
      } as unknown as Proposal;

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['user-obj-1', 'user-obj-2']);
    });

    it('Debe omitir los autores inválidos o nulos de la lista', () => {
      const proposal = {
        authors: ['valid-1', null, { id: 'valid-2' }, undefined, {}],
      } as unknown as Proposal;

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['valid-1', 'valid-2']);
    });

    it('Debe extraer correctamente los IDs del director, codirector y asesor', () => {
      const proposal = {
        director: { id: 'dir-1' },
        codirector: { id: 'codir-1' },
        advisor: { id: 'adv-1' },
      } as unknown as Proposal;

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['dir-1', 'codir-1', 'adv-1']);
    });

    it('Debe extraer todos los IDs de todos los roles combinados correctamente', () => {
      const proposal = {
        authors: ['author-1', { id: 'author-2' }],
        director: { id: 'dir-1' },
        codirector: { id: 'codir-1' },
        advisor: { id: 'adv-1' },
      } as unknown as Proposal;

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['author-1', 'author-2', 'dir-1', 'codir-1', 'adv-1']);
    });

    it('Debe ignorar roles que existan en el objeto pero que no tengan una propiedad "id"', () => {
      const proposal = {
        authors: ['author-1'],
        director: { name: 'Solo Nombre, sin ID' }, // No tiene ID
        codirector: null,
      } as unknown as Proposal;

      const result = collectParticipantIds(proposal);
      expect(result).toEqual(['author-1']);
    });
  });
});
