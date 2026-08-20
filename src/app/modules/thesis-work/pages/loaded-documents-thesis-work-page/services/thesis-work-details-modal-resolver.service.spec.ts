import { TestBed } from '@angular/core/testing';
import { ThesisWorkDetailsModalResolverService } from './thesis-work-details-modal-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

// Aislar el helper de fechas puramente, mejor práctica en ES Modules
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn()
}));
import { formatThesisDate } from '../../../helpers/thesis-date.helper';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

// Utilidades estrictas de TypeScript para inferir los tipos de los arreglos internos
// Esto nos evita usar "any" y no requiere importar interfaces adicionales.
type FinalDeliveryItem = NonNullable<ThesisWork['finalDeliveries']>[0];
type PazYSalvoItem = NonNullable<ThesisWork['pazYSalvos']>[0];

describe('ThesisWorkDetailsModalResolverService', () => {
  let service: ThesisWorkDetailsModalResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThesisWorkDetailsModalResolverService]
    });
    service = TestBed.inject(ThesisWorkDetailsModalResolverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolve() (Switch principal)', () => {
    it('debe resolver null si el tab no coincide (default case)', () => {
      const mockThesis: Partial<ThesisWork> = {};
      expect(service.resolve('id-1', 'TAB_INVALIDO', mockThesis as ThesisWork)).toBeNull();
    });
  });

  describe('resolveAdvance', () => {
    it('debe resolver un AVANCE correctamente si lo encuentra', () => {
      const mockAdvance: Partial<Advance> = { id: 'adv-1', title: 'Avance 1' };
      const thesis: Partial<ThesisWork> = { advances: [mockAdvance as Advance] };

      const result = service.resolve('adv-1', 'AVANCES', thesis as ThesisWork);
      expect(result?.title).toBe('Avance 1');
    });

    it('debe retornar null si no encuentra el avance o el array no existe', () => {
      const thesis: Partial<ThesisWork> = { advances: [] };
      const emptyThesis: Partial<ThesisWork> = {};

      expect(service.resolve('adv-999', 'AVANCES', thesis as ThesisWork)).toBeNull();
      expect(service.resolve('adv-1', 'AVANCES', emptyThesis as ThesisWork)).toBeNull();
    });
  });

  describe('resolveDelivery', () => {
    it('debe resolver una ENTREGA FINAL con anexos y su estado original', () => {
      const mockDelivery: Partial<FinalDeliveryItem> = {
        id: 'del-1',
        status: stateList.APROBADO,
        monograph: { id: 'm-1' } as FileDocument,
        formatE: { id: 'fe-1' } as FileDocument,
        annexes: { id: 'an-1' } as FileDocument
      };

      const thesis: Partial<ThesisWork> = {
        finalDeliveries: [mockDelivery as FinalDeliveryItem]
      };

      const result = service.resolve('del-1', 'ENTREGA FINAL', thesis as ThesisWork);
      expect(result?.id).toBe('del-1');
      expect(result?.status).toBe(stateList.APROBADO);
      expect(result?.documents?.length).toBe(3);
    });

    it('debe resolver una ENTREGA FINAL sin anexos y aplicar estado por defecto EN_REVISION', () => {
      const mockDelivery: Partial<FinalDeliveryItem> = {
        id: 'del-2',
        monograph: { id: 'm-2' } as FileDocument,
        formatE: { id: 'fe-2' } as FileDocument
      };

      const thesis: Partial<ThesisWork> = {
        finalDeliveries: [mockDelivery as FinalDeliveryItem]
      };

      const result = service.resolve('del-2', 'ENTREGA FINAL', thesis as ThesisWork);
      expect(result?.documents?.length).toBe(2);
      expect(result?.status).toBe(stateList.EN_REVISION); // Fallback aplicado
    });

    it('debe retornar null si no encuentra la entrega final', () => {
      const thesis: Partial<ThesisWork> = { finalDeliveries: [] };
      expect(service.resolve('del-999', 'ENTREGA FINAL', thesis as ThesisWork)).toBeNull();
    });
  });

  describe('resolvePazYSalvo', () => {
    it('debe resolver PAZ Y SALVO aprobados y con comentarios académicos', () => {
      const mockPys: Partial<PazYSalvoItem> = {
        id: 'pys-1',
        academicApproved: true,
        academicComments: 'Todo excelente',
        financialApproved: true,
        document: { id: 'doc-pys' } as FileDocument
      };

      const thesis: Partial<ThesisWork> = {
        pazYSalvos: [mockPys as PazYSalvoItem]
      };

      const result = service.resolve('doc-pys', 'PAZ Y SALVO', thesis as ThesisWork);
      expect(result?.comments).toContain('Aprobación Académica: ✅ Sí');
      expect(result?.comments).toContain('Obs: Todo excelente');
      expect(result?.comments).toContain('Aprobación Financiera: ✅ Sí');
      expect(result?.status).toBe(stateList.EN_REVISION); // Fallback
    });

    it('debe resolver PAZ Y SALVO no aprobados y con comentarios financieros', () => {
      const mockPys: Partial<PazYSalvoItem> = {
        id: 'pys-2',
        academicApproved: false,
        financialApproved: false,
        financialComments: 'Falta pago matrícula',
        document: { id: 'doc-pys-2', status: stateList.NO_APROBADO } as FileDocument
      };

      const thesis: Partial<ThesisWork> = {
        pazYSalvos: [mockPys as PazYSalvoItem]
      };

      const result = service.resolve('doc-pys-2', 'PAZ Y SALVO', thesis as ThesisWork);
      expect(result?.comments).toContain('Aprobación Académica: ❌ No');
      expect(result?.comments).toContain('Aprobación Financiera: ❌ No');
      expect(result?.comments).toContain('Obs: Falta pago matrícula');
      expect(result?.status).toBe(stateList.NO_APROBADO);
    });

    it('debe retornar null si no encuentra el registro de paz y salvo', () => {
      const thesis: Partial<ThesisWork> = { pazYSalvos: [] };
      expect(service.resolve('doc-999', 'PAZ Y SALVO', thesis as ThesisWork)).toBeNull();
    });
  });

  describe('resolveCorrespondence', () => {
    it('debe resolver CORRESPONDENCIA con estado original', () => {
      const thesis: Partial<ThesisWork> = {
        documents: [{ id: 'doc-1', status: stateList.EN_REVISION } as FileDocument]
      };

      const result = service.resolve('doc-1', 'CORRESPONDENCIA', thesis as ThesisWork);
      expect(result?.title).toBe('Resolución / Correspondencia Final Oficial');
      expect(result?.status).toBe(stateList.EN_REVISION);
    });

    it('debe resolver CORRESPONDENCIA aplicando estado por defecto APROBADO', () => {
      const thesis: Partial<ThesisWork> = {
        documents: [{ id: 'doc-2' } as FileDocument] // Sin status explícito
      };

      const result = service.resolve('doc-2', 'CORRESPONDENCIA', thesis as ThesisWork);
      expect(result?.status).toBe(stateList.APROBADO);
    });

    it('debe retornar null si no encuentra la correspondencia', () => {
      const thesis: Partial<ThesisWork> = { documents: [] };
      expect(service.resolve('doc-999', 'CORRESPONDENCIA', thesis as ThesisWork)).toBeNull();
    });
  });

  describe('resolveSpecialRequest', () => {
    it('debe resolver SOLICITUDES con todos los detalles incluyendo grantedDeadline formateado', () => {
      (formatThesisDate as jest.Mock).mockReturnValue('27 - 07 - 2026');

      const mockRequest: Partial<SpecialRequest> = {
        id: 'req-1',
        requestType: SpecialRequestType.PRORROGA,
        description: 'Motivos de salud',
        resolutionDetails: 'Aprobado por comité',
        grantedDeadline: new Date('2026-07-27'),
        directorId: 'dir-1',
        status: stateList.APROBADO,
        requestDate: new Date('2026-07-20')
      };

      const thesis: Partial<ThesisWork> = {
        specialRequests: [mockRequest as SpecialRequest]
      };

      const result = service.resolve('req-1', 'SOLICITUDES', thesis as ThesisWork);

      expect(result?.title).toBe(SpecialRequestType.PRORROGA);

      expect(result?.studentId).toBe('dir-1');
      expect(result?.comments).toContain('Motivos de salud');
      expect(result?.comments).toContain('Resolución del comité: Aprobado por comité');
      expect(result?.comments).toContain('Fecha concedida: 27 - 07 - 2026');
    });

    it('debe resolver SOLICITUDES solo con la descripción básica (sin resolución ni fecha)', () => {
      const mockRequest: Partial<SpecialRequest> = {
        id: 'req-2',
        description: 'Solo descripción sin respuesta aún',
        requestDate: new Date('2026-07-20') // <- Se incluye la propiedad obligatoria
      };

      const thesis: Partial<ThesisWork> = {
        specialRequests: [mockRequest as SpecialRequest]
      };

      const result = service.resolve('req-2', 'SOLICITUDES', thesis as ThesisWork);
      expect(result?.comments).toBe('Solo descripción sin respuesta aún');
      expect(result?.comments).not.toContain('Resolución del comité');
      expect(result?.comments).not.toContain('Fecha concedida');
    });

    it('debe retornar null si no encuentra la solicitud especial', () => {
      const thesis: Partial<ThesisWork> = { specialRequests: [] };
      expect(service.resolve('req-999', 'SOLICITUDES', thesis as ThesisWork)).toBeNull();
    });
  });
});
