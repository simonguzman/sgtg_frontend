import { TestBed } from '@angular/core/testing';
import { PreliminaryDraftMapperService } from './preliminary-draft-mapper.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';

describe('PreliminaryDraftMapperService', () => {
  let service: PreliminaryDraftMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreliminaryDraftMapperService]
    });
    service = TestBed.inject(PreliminaryDraftMapperService);
  });

  it('debería mapear correctamente un PreliminaryDraft a PreliminaryDraftTableRow', () => {
    const mockDraft = {
      preliminaryDraftId: '123',
      state: stateList.EN_REVISION,
      proposalData: { title: 'Test Title', modality: 'Trabajo de Grado', description: 'Test Desc' }
    } as unknown as PreliminaryDraft; // <-- Solución aplicada aquí

    const result = service.mapPreliminaryDraftToTable(mockDraft, true, true, 'user-1');

    expect(result.id).toBe('123');
    expect(result.title).toBe('Test Title');
    expect(result.modality).toBe('Trabajo de Grado');
    expect(result.description).toBe('Test Desc');
    expect(result.state).toBe(stateList.EN_REVISION);
  });

  it('debería calcular las acciones permitidas correctamente para un Administrador', () => {
    const mockDraft = { state: stateList.EN_REVISION } as unknown as PreliminaryDraft; // <-- Solución aplicada aquí

    // isAdmin = true, hasFullAccessRole = true
    const allowed = service['calculateAllowedActions'](mockDraft, true, true, 'admin-1');

    expect(allowed).toEqual(['ver descripción', 'ver', 'editar', 'eliminar']);
  });

  it('debería restringir acciones si el usuario no tiene relación con el anteproyecto', () => {
    const mockDraft = {
      state: stateList.EN_REVISION,
      proposalData: { authors: [{ id: 'student-1' }] }
    } as unknown as PreliminaryDraft;

    // Usuario 'user-x' no es admin ni autor
    const allowed = service['calculateAllowedActions'](mockDraft, false, false, 'user-x');

    expect(allowed).toEqual(['ver descripción']);
  });

  it('debería extraer y concatenar los participantes ocultos correctamente', () => {
    const mockDraft = {
      proposalData: {
        director: { firstName: 'Juan', lastName: 'Perez' },
        authors: [{ firstName: 'Maria', lastName: 'Gomez' }]
      }
    } as unknown as PreliminaryDraft;

    const result = service['buildHiddenParticipants'](mockDraft);

    expect(result).toContain('Juan Perez');
    expect(result).toContain('Maria Gomez');
  });
});
