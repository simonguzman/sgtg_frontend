import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ArchivedRecordResolverService, ArchivedRecordType } from './archived-record-resolver.service';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';

import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FinalDelivery } from '../../../../thesis-work/interfaces/final-delivery.interface';
import { Advance } from '../../../../thesis-work/interfaces/advance.interface';
import { ArchivedBaseProposal } from '../../../interfaces/archived-base-proposal.interface';

// FIX: Eliminados todos los `any`. Utilizamos Partial<> para respetar la forma original
// de las interfaces sin tener que simular campos irrelevantes para la prueba.
interface MockProposal {
  id: string;
  state: string;
  documents?: FileDocument[];
}
interface MockDraft {
  preliminaryDraftId: string;
  state: string;
  proposalData?: Partial<ArchivedBaseProposal>;
  documents?: FileDocument[];
}
interface MockThesis {
  thesisWorkId: string;
  state: string;
  preliminaryDraftData?: { proposalData?: Partial<ArchivedBaseProposal> };
  documents?: FileDocument[];
  finalDeliveries?: Partial<FinalDelivery>[];
  advances?: Partial<Advance>[]; // <- Añadido para soportar la nueva lógica
}

describe('ArchivedRecordResolverService', () => {
  let resolverService: ArchivedRecordResolverService;

  // Signals que simulan la fuente de verdad (la base de datos en memoria completa)
  let mockAllProposals: WritableSignal<MockProposal[]>;
  let mockAllDrafts: WritableSignal<MockDraft[]>;
  let mockAllThesisWorks: WritableSignal<MockThesis[]>;

  beforeEach(() => {
    mockAllProposals = signal<MockProposal[]>([]);
    mockAllDrafts = signal<MockDraft[]>([]);
    mockAllThesisWorks = signal<MockThesis[]>([]);

    const mockProposalService = { allProposals: mockAllProposals };
    const mockDraftService = { allPreliminaryDrafts: mockAllDrafts };
    const mockThesisService = { allThesisWorks: mockAllThesisWorks };

    TestBed.configureTestingModule({
      providers: [
        ArchivedRecordResolverService,
        { provide: ProposalService, useValue: mockProposalService as unknown as ProposalService },
        { provide: PreliminaryDraftService, useValue: mockDraftService as unknown as PreliminaryDraftService },
        { provide: ThesisWorkService, useValue: mockThesisService as unknown as ThesisWorkService },
      ],
    });

    resolverService = TestBed.inject(ArchivedRecordResolverService);
  });

  describe('Enrutamiento de Tipos (Switch)', () => {
    it('debería retornar null para un tipo desconocido', () => {
      const result = resolverService.resolve('tipo-invalido' as unknown as ArchivedRecordType, '123');
      expect(result).toBeNull();
    });
  });

  describe('Resolución de Propuestas (propuestas)', () => {
    it('debería retornar null si la propuesta no existe', () => {
      const result = resolverService.resolve('propuestas', 'p-123');
      expect(result).toBeNull();
    });

    it('debería resolver una propuesta exitosamente mapeando sus documentos', () => {
      const mockDoc = { id: 'd1', name: 'Doc 1' } as FileDocument;
      mockAllProposals.set([{ id: 'p-123', state: 'RECHAZADO', documents: [mockDoc] }]);

      const result = resolverService.resolve('propuestas', 'p-123');

      expect(result).not.toBeNull();
      expect(result?.state).toBe('RECHAZADO');
      expect(result?.baseProposal).toEqual({ id: 'p-123', state: 'RECHAZADO', documents: [mockDoc] });
      expect(result?.documents).toEqual([mockDoc]);
    });

    it('debería usar un arreglo vacío por defecto si la propuesta no tiene documentos', () => {
      mockAllProposals.set([{ id: 'p-123', state: 'ARCHIVADO' }]);

      const result = resolverService.resolve('propuestas', 'p-123');
      expect(result?.documents).toEqual([]);
    });
  });

  describe('Resolución de Anteproyectos (anteproyectos)', () => {
    it('debería retornar null si el anteproyecto no existe', () => {
      const result = resolverService.resolve('anteproyectos', 'd-123');
      expect(result).toBeNull();
    });

    it('debería resolver un anteproyecto y extraer proposalData', () => {
      const mockBase: Partial<ArchivedBaseProposal> = { title: 'Anteproyecto 1' };
      const mockDoc = { id: 'd1', name: 'Doc 2' } as FileDocument;

      mockAllDrafts.set([
        { preliminaryDraftId: 'd-123', state: 'APROBADO', proposalData: mockBase, documents: [mockDoc] }
      ]);

      const result = resolverService.resolve('anteproyectos', 'd-123');

      expect(result?.state).toBe('APROBADO');
      expect(result?.baseProposal).toEqual(mockBase);
      expect(result?.documents).toEqual([mockDoc]);
    });
  });

  describe('Resolución de Trabajos de Grado (trabajos)', () => {
    it('debería retornar null si el trabajo de grado no existe', () => {
      const result = resolverService.resolve('trabajos', 't-123');
      expect(result).toBeNull();
    });

    it('debería aplicar fallbacks seguros si no tiene datos anidados, ni docs, ni entregas', () => {
      mockAllThesisWorks.set([{ thesisWorkId: 't-123', state: 'EN_PROCESO' }]);

      const result = resolverService.resolve('trabajos', 't-123');
      expect(result?.baseProposal).toEqual({});
      expect(result?.documents).toEqual([]);
    });

    // NUEVO: Test exclusivo para garantizar que la recolección de documentos (raíz, entregas y AVANCES)
    // funciona y además respeta la lógica del Set para ignorar IDs repetidos.
    it('debería extraer y deduplicar documentos de la raíz, entregas finales y avances', () => {
      const mockBase: Partial<ArchivedBaseProposal> = { title: 'Trabajo 1' };

      // Creamos documentos con IDs explícitos
      const docRaiz = { id: 'uuid-1', name: 'Principal' } as FileDocument;
      const docMonografia = { id: 'uuid-2', name: 'Monografía' } as FileDocument;
      const docAvance = { id: 'uuid-3', name: 'Evidencia Avance' } as FileDocument;

      // Documento trampa: Tiene un ID que ya existe en la raíz
      const docDuplicado = { id: 'uuid-1', name: 'Principal Clonado' } as FileDocument;

      const delivery: Partial<FinalDelivery> = { monograph: docMonografia };
      const advance: Partial<Advance> = { documents: [docAvance, docDuplicado] }; // Metemos el duplicado aquí

      mockAllThesisWorks.set([
        {
          thesisWorkId: 't-123',
          state: 'FINALIZADO',
          preliminaryDraftData: { proposalData: mockBase },
          documents: [docRaiz],
          finalDeliveries: [delivery as FinalDelivery],
          advances: [advance as Advance]
        }
      ]);

      const result = resolverService.resolve('trabajos', 't-123');

      expect(result?.state).toBe('FINALIZADO');
      expect(result?.baseProposal).toEqual(mockBase);

      // Verificamos que el documento duplicado (uuid-1) NO entró al array final
      expect(result?.documents).toHaveLength(3);
      expect(result?.documents).toEqual([
        docRaiz,
        docMonografia,
        docAvance
      ]);
    });
  });
});
