import { TestBed } from '@angular/core/testing';
import { PreliminaryDraftMapperService } from './preliminary-draft-mapper.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { Modality } from '../../../../proposal/enums/modality.enum';

// 🔹 REFACTOR: Fábricas para generar datos limpios y tipados sin usar 'as unknown'
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default-id',
  firstName: 'Nombre',
  lastName: 'Apellido',
  roles: [],
  ...overrides
} as User);

// El tipado parcial en la declaración permite que no tengamos que llenar
// toda la interfaz gigantesca, mientras evitamos el error de superposición en el casteo.
const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => {
  const base: Partial<PreliminaryDraft> = {
    preliminaryDraftId: 'draft-default-id',
    state: stateList.EN_REVISION,
    evaluators: [],
    documents: [],
    evaluations: [],
    proposalData: undefined,
    ...overrides
  };
  return base as PreliminaryDraft;
};

// Como proposalData es otra interfaz compleja, conviene tener su propia fábrica
type ProposalData = NonNullable<PreliminaryDraft['proposalData']>;
const createMockProposalData = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: 'prop-default-id',
  title: 'Default Title',
  description: 'Default Desc',
  modality: Modality.TI,
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  authors: [],
  ...overrides
} as ProposalData);

describe('PreliminaryDraftMapperService', () => {
  let service: PreliminaryDraftMapperService;

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [PreliminaryDraftMapperService]
    });
    service = TestBed.inject(PreliminaryDraftMapperService);
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar las implementaciones originales de la consola
  });

  it('debería mapear correctamente un PreliminaryDraft a PreliminaryDraftTableRow', () => {
    // Uso limpio de fábricas sin casteos oscuros
    const mockDraft = createMockDraft({
      preliminaryDraftId: '123',
      state: stateList.EN_REVISION,
      proposalData: createMockProposalData({
        title: 'Test Title',
        modality: Modality.TI,
        description: 'Test Desc'
      })
    });

    const result = service.mapPreliminaryDraftToTable(mockDraft, true, true, 'user-1');

    expect(result.id).toBe('123');
    expect(result.title).toBe('Test Title');
    expect(result.modality).toBe(Modality.TI); // Ahora devuelve el enum en lugar de un string arbitrario
    expect(result.description).toBe('Test Desc');
    expect(result.state).toBe(stateList.EN_REVISION);
  });

  it('debería calcular las acciones permitidas correctamente para un Administrador', () => {
    const mockDraft = createMockDraft({ state: stateList.EN_REVISION });

    // isAdmin = true, hasFullAccessRole = true
    // Nota: Como estamos probando un método privado, TypeScript requiere que ignoremos el encapsulamiento
    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    const allowed = service.calculateAllowedActions(mockDraft, true, true, 'admin-1');

    expect(allowed).toEqual(['ver descripción', 'ver', 'editar', 'eliminar']);
  });

  it('debería restringir acciones si el usuario no tiene relación con el anteproyecto', () => {
    const mockDraft = createMockDraft({
      state: stateList.EN_REVISION,
      proposalData: createMockProposalData({
        authors: [createMockUser({ id: 'student-1' })]
      })
    });

    // Usuario 'user-x' no es admin ni autor
    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    const allowed = service.calculateAllowedActions(mockDraft, false, false, 'user-x');

    expect(allowed).toEqual(['ver descripción']);
  });

  it('debería extraer y concatenar los participantes ocultos correctamente', () => {
    const mockDraft = createMockDraft({
      proposalData: createMockProposalData({
        director: createMockUser({ firstName: 'Juan', lastName: 'Perez' }),
        authors: [createMockUser({ firstName: 'Maria', lastName: 'Gomez' })]
      })
    });

    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    const result = service.buildHiddenParticipants(mockDraft);

    expect(result).toContain('Juan Perez');
    expect(result).toContain('Maria Gomez');
  });
});
