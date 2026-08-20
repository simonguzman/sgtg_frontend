import { TestBed } from '@angular/core/testing';
import { SustentationDetailsMapperService } from './sustentation-details-mapper.service';
import { UserService } from '../../../../users/services/user.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';

// Importa los tipos y enums correspondientes
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

describe('SustentationDetailsMapperService', () => {
  let service: SustentationDetailsMapperService;
  let userSpy: jest.Mocked<UserService>;
  let participantsSpy: jest.Mocked<ThesisParticipantsFormatterService>;
  let resolverSpy: jest.Mocked<ThesisFinalDeliveryDocumentResolverService>;

  beforeEach(() => {
    userSpy = { getUserFullName: jest.fn() } as unknown as jest.Mocked<UserService>;
    participantsSpy = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn()
    } as unknown as jest.Mocked<ThesisParticipantsFormatterService>;
    resolverSpy = { resolveLatestFinalDeliveryDocument: jest.fn() } as unknown as jest.Mocked<ThesisFinalDeliveryDocumentResolverService>;

    TestBed.configureTestingModule({
      providers: [
        SustentationDetailsMapperService,
        { provide: UserService, useValue: userSpy },
        { provide: ThesisParticipantsFormatterService, useValue: participantsSpy },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: resolverSpy }
      ]
    });

    service = TestBed.inject(SustentationDetailsMapperService);
  });

  describe('mapToView', () => {
    const sustentationId = 'sus-123';

    const baseThesisWork = {
      state: 'ACTIVO',
      preliminaryDraftData: { proposalData: { title: 'Tesis IA', description: 'Desc', modality: 'Investigación' } },
      sustentations: [
        {
          id: sustentationId,
          status: SustentationStatus.PROGRAMADA,
          sustentationDate: '2026-07-28T10:00:00Z',
          location: 'Aula 101',
          formatEDocument: { name: 'FormatoE.pdf', url: 'http://e.com' },
          verdicts: []
        }
      ],
      specialRequests: [],
      correctedDeliveries: []
    } as unknown as ThesisWork;

    beforeEach(() => {
      participantsSpy.getStudentNames.mockReturnValue('Estudiante 1');
      participantsSpy.getDirectorName.mockReturnValue('Director 1');
      participantsSpy.getCodirectorName.mockReturnValue('Codirector 1');
      participantsSpy.getAssignedJurors.mockReturnValue('Jurado 1, Jurado 2');
    });

    it('debe retornar null si la sustentación no existe', () => {
      const result = service.mapToView(baseThesisWork, 'invalid-id');
      expect(result).toBeNull();
    });

    it('debe mapear correctamente una sustentación con todos sus datos básicos', () => {
      const result = service.mapToView(baseThesisWork, sustentationId);

      expect(result).toBeTruthy();
      expect(result?.title).toBe('Tesis IA');
      expect(result?.modality).toBe('Investigación');
      expect(result?.authors).toBe('Estudiante 1');
      expect(result?.director).toBe('Director 1');
      expect(result?.codirector).toBe('Codirector 1');
      expect(result?.location).toBe('Aula 101');
      expect(result?.isAdministrativelyPostponed).toBe(false);
      expect(result?.formatEDocument?.url).toBe('http://e.com');
    });

    it('debe procesar el aplazamiento administrativo correctamente (Postponed)', () => {
      const postponedWork = {
        ...baseThesisWork,
        sustentations: [{ id: sustentationId, status: SustentationStatus.APLAZADA }],
        specialRequests: [
          {
            requestType: SpecialRequestType.NUEVA_SUSTENTACION, // Uso directo del enum
            status: stateList.APROBADO,
            requestDate: '2026-07-20T00:00:00Z',
            description: 'Enfermedad'
          }
        ]
      } as unknown as ThesisWork;

      const result = service.mapToView(postponedWork, sustentationId);

      expect(result?.isAdministrativelyPostponed).toBe(true);
      expect(result?.postponementReason?.description).toBe('Enfermedad');
    });

    it('debe mapear veredictos y asignar color de estado basado en el estado del veredicto', () => {
      const workWithVerdicts = {
        ...baseThesisWork,
        sustentations: [{
          id: sustentationId,
          verdicts: [
            { jurorId: 'j1', veredict: stateList.APROBADO, evaluationDate: '2026-07-28' },
            { jurorId: 'j2', veredict: stateList.NO_APROBADO, evaluationDate: '2026-07-28' }
          ]
        }]
      } as unknown as ThesisWork;

      userSpy.getUserFullName.mockImplementation(id => id === 'j1' ? 'Profesor A' : 'Profesor B');

      const result = service.mapToView(workWithVerdicts, sustentationId);

      expect(result?.verdicts.length).toBe(2);
      expect(result?.verdicts[0].statusColorClass).toBe('border-l-green-500');
      expect(result?.verdicts[1].statusColorClass).toBe('border-l-red-500');
    });

    it('debe evaluar correctamente si mostrar el botón de documentos corregidos', () => {
      const workWithCorrections = {
        ...baseThesisWork,
        sustentations: [{
          id: sustentationId,
          verdicts: [{ jurorId: 'j1', veredict: stateList.APROBADO_CON_OBSERVACIONES }]
        }],
        correctedDeliveries: []
      } as unknown as ThesisWork;

      const result = service.mapToView(workWithCorrections, sustentationId);
      expect(result?.showCorrectedDocumentsButton).toBe(true);
    });
  });
});
