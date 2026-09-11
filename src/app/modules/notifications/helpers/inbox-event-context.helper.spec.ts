import { extractInboxEventContext } from './inbox-event-context.helper';
import { InboxEventPayload } from '../pages/notifications-page/models/inbox-event-context.model';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

// Esta fábrica asegura que el Payload siempre tenga al menos propiedades nulas
// o indefinidas en vez de forzar un tipo Parcial, simulando la respuesta real del sistema.
const createMockInboxEventPayload = (overrides: Partial<InboxEventPayload> = {}): InboxEventPayload => ({
  // Dejamos las propiedades de interés explícitamente undefined
  // para que el helper ejecute la cascada de (||) de manera natural
  id: undefined,
  title: undefined,
  proposalId: undefined,
  proposalTitle: undefined,
  proposal: undefined,

  draftId: undefined,
  draftTitle: undefined,
  preliminaryDraftId: undefined,
  preliminaryDraftTitle: undefined,
  preliminaryDraft: undefined,
  proposalData: undefined,

  thesisId: undefined,
  thesisTitle: undefined,
  thesisWorkId: undefined,
  thesisWork: undefined,
  preliminaryDraftData: undefined,
  ...overrides
} as InboxEventPayload); // El 'as' aquí es seguro porque controlamos todas las llaves posibles

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('Helper: extractInboxEventContext', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar espías
  });

  describe('Extracción y Fallbacks', () => {

    it('debe retornar los textos por defecto si el payload está completamente vacío', () => {
      const emptyPayload = createMockInboxEventPayload();
      const result = extractInboxEventContext(emptyPayload);

      expect(result.proposalTitle).toBe('Propuesta sin título');
      expect(result.draftTitle).toBe('Anteproyecto sin título');
      expect(result.thesisTitle).toBe('Trabajo de grado sin título');

      // IDs deben ser undefined (el valor falsy natural extraído por el helper)
      expect(result.proposalId).toBeUndefined();
      expect(result.draftId).toBeUndefined();
      expect(result.thesisId).toBeUndefined();
    });

    it('debe extraer el título e ID dándole prioridad a los campos directos de la Propuesta', () => {
      const payload = createMockInboxEventPayload({
        title: 'Título Directo Propuesta',
        proposalId: 'prop-123',
        // Valores de menor prioridad para comprobar que NO se usan (sin any)
        proposal: { id: 'no-id', title: 'No debe usar este' } as InboxEventPayload['proposal']
      });

      const result = extractInboxEventContext(payload);

      expect(result.proposalTitle).toBe('Título Directo Propuesta');
      expect(result.proposalId).toBe('prop-123');
    });

    it('debe extraer el título e ID del Anteproyecto correctamente', () => {
      const payload = createMockInboxEventPayload({
        preliminaryDraftTitle: 'Título Directo Anteproyecto',
        preliminaryDraftId: 'draft-123',
      });

      const result = extractInboxEventContext(payload);

      expect(result.draftTitle).toBe('Título Directo Anteproyecto');
      expect(result.draftId).toBe('draft-123');
    });

    it('debe extraer el título e ID del Trabajo de Grado correctamente', () => {
      const payload = createMockInboxEventPayload({
        thesisTitle: 'Título Directo Tesis',
        thesisWorkId: 'thesis-123',
      });

      const result = extractInboxEventContext(payload);

      expect(result.thesisTitle).toBe('Título Directo Tesis');
      expect(result.thesisId).toBe('thesis-123');
    });

    it('debe usar el ID base genérico (payload.id) como fallback final para los tres niveles', () => {
      const payload = createMockInboxEventPayload({
        id: 'id-generico-global'
      });

      const result = extractInboxEventContext(payload);

      expect(result.proposalId).toBe('id-generico-global');
      expect(result.draftId).toBe('id-generico-global');
      expect(result.thesisId).toBe('id-generico-global');
    });

    it('debe ejecutar la cascada de herencia de títulos si solo existe el título de la propuesta', () => {
      const payload = createMockInboxEventPayload({
        title: 'Sistema de Gestión Base'
      });

      const result = extractInboxEventContext(payload);

      // Como no hay título específico de anteproyecto ni tesis, deben heredar el de la propuesta
      expect(result.proposalTitle).toBe('Sistema de Gestión Base');
      expect(result.draftTitle).toBe('Sistema de Gestión Base');
      expect(result.thesisTitle).toBe('Sistema de Gestión Base');
    });

    it('debe ejecutar la cascada de herencia respetando si el anteproyecto tiene un título distinto', () => {
      const payload = createMockInboxEventPayload({
        title: 'Título Propuesta Original',
        draftTitle: 'Título Anteproyecto Modificado'
      });

      const result = extractInboxEventContext(payload);

      expect(result.proposalTitle).toBe('Título Propuesta Original');
      expect(result.draftTitle).toBe('Título Anteproyecto Modificado');

      // La tesis debe heredar el título del anteproyecto, no el de la propuesta original
      expect(result.thesisTitle).toBe('Título Anteproyecto Modificado');
    });

  });
});
