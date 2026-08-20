import { extractInboxEventContext } from './inbox-event-context.helper'; // Ajusta la ruta del archivo
import { InboxEventPayload } from '../pages/notifications-page/models/inbox-event-context.model';

describe('Inbox Event Context Helper', () => {
  describe('extractInboxEventContext', () => {

    it('Debe retornar los textos por defecto si el payload está completamente vacío', () => {
      const emptyPayload = {} as InboxEventPayload;
      const result = extractInboxEventContext(emptyPayload);

      expect(result.proposalTitle).toBe('Propuesta sin título');
      expect(result.draftTitle).toBe('Anteproyecto sin título');
      expect(result.thesisTitle).toBe('Trabajo de grado sin título');

      // IDs deben ser undefined (o el valor falsy que corresponda)
      expect(result.proposalId).toBeUndefined();
      expect(result.draftId).toBeUndefined();
      expect(result.thesisId).toBeUndefined();
    });

    it('Debe extraer el título e ID dándole prioridad a los campos directos de la Propuesta', () => {
      const payload: Partial<InboxEventPayload> = {
        title: 'Título Directo Propuesta',
        proposalId: 'prop-123',
        // Valores de menor prioridad para comprobar que NO se usan
        proposal: { title: 'No debe usar este', id: 'no-id' } as any,
      };

      const result = extractInboxEventContext(payload as InboxEventPayload);

      expect(result.proposalTitle).toBe('Título Directo Propuesta');
      expect(result.proposalId).toBe('prop-123');
    });

    it('Debe extraer el título e ID del Anteproyecto correctamente', () => {
      const payload: Partial<InboxEventPayload> = {
        preliminaryDraftTitle: 'Título Directo Anteproyecto',
        preliminaryDraftId: 'draft-123',
      };

      const result = extractInboxEventContext(payload as InboxEventPayload);

      expect(result.draftTitle).toBe('Título Directo Anteproyecto');
      expect(result.draftId).toBe('draft-123');
    });

    it('Debe extraer el título e ID del Trabajo de Grado correctamente', () => {
      const payload: Partial<InboxEventPayload> = {
        thesisTitle: 'Título Directo Tesis',
        thesisWorkId: 'thesis-123',
      };

      const result = extractInboxEventContext(payload as InboxEventPayload);

      expect(result.thesisTitle).toBe('Título Directo Tesis');
      expect(result.thesisId).toBe('thesis-123');
    });

    it('Debe usar el ID base genérico (payload.id) como fallback final para los tres niveles', () => {
      const payload: Partial<InboxEventPayload> = {
        id: 'id-generico-global'
      };

      const result = extractInboxEventContext(payload as InboxEventPayload);

      expect(result.proposalId).toBe('id-generico-global');
      expect(result.draftId).toBe('id-generico-global');
      expect(result.thesisId).toBe('id-generico-global');
    });

    it('Debe ejecutar la cascada de herencia de títulos si solo existe el título de la propuesta', () => {
      const payload: Partial<InboxEventPayload> = {
        title: 'Sistema de Gestión Base'
      };

      const result = extractInboxEventContext(payload as InboxEventPayload);

      // Como no hay título específico de anteproyecto ni tesis, deben heredar el de la propuesta
      expect(result.proposalTitle).toBe('Sistema de Gestión Base');
      expect(result.draftTitle).toBe('Sistema de Gestión Base');
      expect(result.thesisTitle).toBe('Sistema de Gestión Base');
    });

    it('Debe ejecutar la cascada de herencia respetando si el anteproyecto tiene un título distinto', () => {
      const payload: Partial<InboxEventPayload> = {
        title: 'Título Propuesta Original',
        draftTitle: 'Título Anteproyecto Modificado'
      };

      const result = extractInboxEventContext(payload as InboxEventPayload);

      expect(result.proposalTitle).toBe('Título Propuesta Original');
      expect(result.draftTitle).toBe('Título Anteproyecto Modificado');
      // La tesis debe heredar el título del anteproyecto, no el de la propuesta
      expect(result.thesisTitle).toBe('Título Anteproyecto Modificado');
    });
  });
});
