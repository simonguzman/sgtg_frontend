import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';

// Extraemos el tipo exacto para evitar importar interfaces no necesarias
type PreliminaryDraftData = NonNullable<ThesisWork['preliminaryDraftData']>;

describe('ThesisWorkAdvanceService', () => {
  let service: ThesisWorkAdvanceService;

  // Tipado estricto para los espías
  let storageSpy: { updateWork: jest.Mock };
  let eventBusSpy: { emit: jest.Mock };

  // Mocks de documentos estructurados
  const mockAvanceDocument: FileDocument = {
    id: 'doc-avance-1',
    name: 'Primer_Avance.pdf',
    url: 'uploads/avance1.pdf',
    uploadDate: '2026-03-01T10:00:00Z',
    type: DocumentType.AVANCE,
    status: stateList.EN_REVISION,
  };

  const mockFormatoDocument: FileDocument = {
    id: 'doc-formato-1',
    name: 'FormatoA.pdf',
    url: 'uploads/formato.pdf',
    uploadDate: '2026-03-01T10:00:00Z',
    type: DocumentType.FORMATO,
    status: stateList.EN_REVISION,
  };

  const mockOtherDocument: FileDocument = {
    id: 'doc-pys-1',
    name: 'PazYSalvo.pdf',
    url: 'uploads/pys.pdf',
    uploadDate: '2026-03-01T10:00:00Z',
    type: DocumentType.PAZ_Y_SALVO,
    status: stateList.EN_REVISION,
  };

  // Corrección: Aplicamos el cast parcial estricto también al objeto anidado
  const mockThesisWork = {
    id: 'thesis-123', // Propiedad base requerida por el servicio refactorizado
    thesisWorkId: 'thesis-123',
    state: stateList.EN_DESARROLLO,
    documents: [],
    advances: [],
    preliminaryDraftData: {
      proposalData: {
        title: 'Sistema de Gestión Tesis',
        authors: [{ id: 'author-1' } as Partial<User> as User],
        director: { id: 'director-1' } as Partial<User> as User,
      },
    } as Partial<PreliminaryDraftData> as PreliminaryDraftData, // Cast anidado estricto
  } as Partial<ThesisWork> as ThesisWork;

  beforeEach(() => {
    storageSpy = {
      updateWork: jest.fn(),
    };

    eventBusSpy = {
      emit: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkAdvanceService,
        { provide: ThesisWorkStorageService, useValue: storageSpy },
        { provide: EventBusService, useValue: eventBusSpy },
      ],
    });

    service = TestBed.inject(ThesisWorkAdvanceService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('uploadDocumentMock', () => {
    it('debe agregar un documento que NO es AVANCE ni FORMATO sin alterar el estado del trabajo', fakeAsync(() => {
      let updatedResult: ThesisWork | undefined;

      storageSpy.updateWork.mockImplementation((id: string, updateFn: (work: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(mockThesisWork);
      });

      let completed = false;

      service.uploadDocumentMock('thesis-123', mockOtherDocument).subscribe(() => {
        completed = true;
      });

      tick(800);

      expect(completed).toBe(true);
      expect(storageSpy.updateWork).toHaveBeenCalledWith('thesis-123', expect.any(Function));
      expect(updatedResult?.documents).toContainEqual(mockOtherDocument);
      expect(updatedResult?.state).toBe(stateList.EN_DESARROLLO);
      expect(eventBusSpy.emit).not.toHaveBeenCalled();
    }));

    it('debe actualizar el estado a EN_REVISION si se carga un documento de tipo FORMATO', fakeAsync(() => {
      let updatedResult: ThesisWork | undefined;

      storageSpy.updateWork.mockImplementation((id: string, updateFn: (work: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(mockThesisWork);
      });

      service.uploadDocumentMock('thesis-123', mockFormatoDocument).subscribe();
      tick(800);

      expect(updatedResult?.documents).toContainEqual(mockFormatoDocument);
      expect(updatedResult?.state).toBe(stateList.EN_REVISION);
      expect(eventBusSpy.emit).not.toHaveBeenCalled();
    }));

    it('debe crear un nuevo avance y emitir el evento THESIS_ADVANCE_UPLOADED cuando el documento es AVANCE', fakeAsync(() => {
      const advanceMeta: CreateAdvanceRequest = {
        advanceId: 'adv-new-1',
        title: 'Entrega de Capitulo 1',
        comments: 'Revisión inicial de requerimientos',
        studentId: 'student-100',
      };

      let updatedResult: ThesisWork | undefined;

      storageSpy.updateWork.mockImplementation((id: string, updateFn: (work: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(mockThesisWork);
      });

      service.uploadDocumentMock('thesis-123', mockAvanceDocument, advanceMeta).subscribe();
      tick(800);

      expect(updatedResult?.advances).toHaveLength(1);
      expect(updatedResult?.advances?.[0]).toEqual({
        id: 'adv-new-1',
        title: 'Entrega de Capitulo 1',
        comments: 'Revisión inicial de requerimientos',
        uploadDate: new Date('2026-03-01T10:00:00Z'),
        studentId: 'student-100',
        status: stateList.EN_REVISION,
        documents: [mockAvanceDocument],
      });

      expect(eventBusSpy.emit).toHaveBeenCalledWith({
        type: AppEventType.THESIS_ADVANCE_UPLOADED,
        targetUserIds: expect.arrayContaining(['author-1', 'director-1']),
        payload: {
          thesisId: 'thesis-123',
          thesisWorkId: 'thesis-123',
          title: 'Entrega de Capitulo 1',
          thesisTitle: 'Sistema de Gestión Tesis',
        },
      });
    }));

    it('debe anexar el documento a un avance existente si el advanceId coincide', fakeAsync(() => {
      const existingThesisWithAdvance = {
        ...mockThesisWork,
        advances: [
          {
            id: 'adv-existente-1',
            title: 'Avance 1 Existente',
            comments: 'Comentarios previos',
            uploadDate: new Date('2026-02-01T10:00:00Z'),
            studentId: 'student-100',
            status: stateList.EN_REVISION,
            documents: [],
          },
        ],
      } as Partial<ThesisWork> as ThesisWork;

      const advanceMeta: CreateAdvanceRequest = {
        advanceId: 'adv-existente-1',
        title: 'Documento Adicional',
        comments: 'Anexando nuevo archivo',
        studentId: 'student-100'
      };

      let updatedResult: ThesisWork | undefined;

      storageSpy.updateWork.mockImplementation((id: string, updateFn: (work: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(existingThesisWithAdvance);
      });

      service.uploadDocumentMock('thesis-123', mockAvanceDocument, advanceMeta).subscribe();
      tick(800);

      expect(updatedResult?.advances).toHaveLength(1);
      expect(updatedResult?.advances?.[0].documents).toContainEqual(mockAvanceDocument);
      expect(eventBusSpy.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.THESIS_ADVANCE_UPLOADED,
          payload: expect.objectContaining({
            title: 'Documento Adicional',
          }),
        })
      );
    }));

    it('debe tomar el id y nombre del documento como valores por defecto si no se pasa advanceMeta', fakeAsync(() => {
      let updatedResult: ThesisWork | undefined;

      storageSpy.updateWork.mockImplementation((id: string, updateFn: (work: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(mockThesisWork);
      });

      service.uploadDocumentMock('thesis-123', mockAvanceDocument).subscribe();
      tick(800);

      expect(updatedResult?.advances?.[0].id).toBe(mockAvanceDocument.id);
      expect(updatedResult?.advances?.[0].title).toBe(mockAvanceDocument.name);
      expect(eventBusSpy.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            title: mockAvanceDocument.name,
          }),
        })
      );
    }));
  });
});
