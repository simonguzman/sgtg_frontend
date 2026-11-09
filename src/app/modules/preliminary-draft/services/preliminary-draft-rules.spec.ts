import { anteproyectoCorregible } from './preliminary-draft-rules';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

const version = (numero: number, status: stateList): FileDocument => ({
  id: `v${numero}`, name: `Anteproyecto v${numero}`, url: `/v${numero}`, type: DocumentType.ANTEPROYECTO,
  version: numero, status
} as FileDocument);

describe('preliminary-draft-rules', () => {
  describe('anteproyectoCorregible', () => {
    it('el director radica una nueva versión si la vigente quedó evaluada con observaciones o no aprobada', () => {
      expect(anteproyectoCorregible({ documents: [version(1, stateList.EVALUADO_CON_OBSERVACIONES)] })).toBe(true);
      expect(anteproyectoCorregible({ documents: [version(1, stateList.NO_APROBADO)] })).toBe(true);
    });

    it('no mientras se evalúa ni cuando está aprobada', () => {
      expect(anteproyectoCorregible({ documents: [version(1, stateList.EN_REVISION)] })).toBe(false);
      expect(anteproyectoCorregible({ documents: [version(1, stateList.APROBADO)] })).toBe(false);
      expect(anteproyectoCorregible(null)).toBe(false);
    });

    it('cuenta la versión vigente (la de mayor número), no las anteriores', () => {
      expect(anteproyectoCorregible({
        documents: [version(1, stateList.EVALUADO_CON_OBSERVACIONES), version(2, stateList.EN_REVISION)]
      })).toBe(false);
    });
  });
});
