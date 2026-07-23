import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { PreliminaryDraftApiService } from './preliminary-draft-api.service';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

describe('PreliminaryDraftApiService', () => {
  let service: PreliminaryDraftApiService;

  // Reemplazamos los 'any' por las clases originales envueltas en jest.Mocked
  let mockStorageService: jest.Mocked<PreliminaryDraftStorageService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  beforeEach(() => {
    // Sobrescribir crypto para evitar IDs aleatorios que rompan los tests
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('mocked-uuid') },
      configurable: true // Permite reconfigurar si es necesario en otros tests
    });

    // Inicializamos los mocks con as unknown as jest.Mocked<T>
    mockStorageService = {
      getById: jest.fn(),
      addDraft: jest.fn(),
      updateDraft: jest.fn(),
      removeDraft: jest.fn()
    } as unknown as jest.Mocked<PreliminaryDraftStorageService>;

    mockUserService = {
      // Simulamos que el sistema tiene al menos un Jefe de Departamento para la prueba de notificaciones
      users: signal([{ id: 'jefe-depto-1', roles: [UserRoleType.JEFE_DEP] }])
    } as unknown as jest.Mocked<UserService>;

    mockEventBusService = {
      emit: jest.fn()
    } as unknown as jest.Mocked<EventBusService>;

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftApiService,
        { provide: PreliminaryDraftStorageService, useValue: mockStorageService },
        { provide: UserService, useValue: mockUserService },
        { provide: EventBusService, useValue: mockEventBusService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getPreliminaryDraftById', () => {
    it('debería retornar un observable con el anteproyecto si existe', (done) => {
      const mockDraft = { preliminaryDraftId: '1', state: stateList.EN_REVISION } as PreliminaryDraft;
      mockStorageService.getById.mockReturnValue(of(mockDraft));

      service.getPreliminaryDraftById('1').subscribe((result) => {
        expect(result).toEqual(mockDraft);
        expect(mockStorageService.getById).toHaveBeenCalledWith('1');
        done();
      });
    });
  });

  describe('createPreliminaryDraft', () => {
    it('debería crear el anteproyecto, guardar en storage y emitir notificaciones con delay', fakeAsync(() => {
      const newDraftPayload = {
        proposalData: {
          title: 'Título de Prueba',
          authors: ['author-1', { id: 'author-2' }], // Probamos ambos tipos que acepta el método (string y objeto)
          director: { id: 'director-1' },
          codirector: { id: 'codirector-1' },
          advisor: { id: 'advisor-1' }
        }
      } as unknown as PreliminaryDraft;

      let resultDraft: PreliminaryDraft | undefined;

      service.createPreliminaryDraft(newDraftPayload).subscribe((res) => {
        resultDraft = res;
      });

      // Avanzamos el tiempo virtual para superar el delay(1000)
      tick(1000);

      // 1. Verificamos que se haya devuelto el payload original en el flujo (como lo hace el of())
      expect(resultDraft).toEqual(newDraftPayload);

      // 2. Verificamos que se llamó a guardar en storage con los datos enriquecidos
      expect(mockStorageService.addDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          preliminaryDraftId: 'mocked-uuid',
          state: stateList.EN_REVISION,
          evaluations: [],
          documents: []
        })
      );

      // 3. Verificamos la emisión de evento en el EventBus
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_CREATED,
          payload: {
            preliminaryDraftId: 'mocked-uuid',
            preliminaryDraftTitle: 'Título de Prueba'
          }
        })
      );

      // 4. Verificamos que las notificaciones lleguen a las personas correctas (Autores, Director, Codirector, Asesor, y Jefe de Depto)
      const emitCallArgs = mockEventBusService.emit.mock.calls[0][0];
      const targetUserIds = emitCallArgs.targetUserIds;

      expect(targetUserIds).toContain('author-1');
      expect(targetUserIds).toContain('author-2');
      expect(targetUserIds).toContain('director-1');
      expect(targetUserIds).toContain('codirector-1');
      expect(targetUserIds).toContain('advisor-1');
      expect(targetUserIds).toContain('jefe-depto-1'); // Viene del mockUserService
    }));
  });

  describe('updatePreliminaryDraft', () => {
    it('debería actualizar el anteproyecto a través del callback del storage con delay', fakeAsync(() => {
      const updatedData = { state: stateList.APROBADO } as PreliminaryDraft;

      let resultDraft: PreliminaryDraft | undefined;

      service.updatePreliminaryDraft('1', updatedData).subscribe((res) => {
        resultDraft = res;
      });

      // Avanzamos 800ms
      tick(800);

      expect(resultDraft).toEqual(updatedData);

      // Verificamos que se llamó a updateDraft con el ID y una función callback
      expect(mockStorageService.updateDraft).toHaveBeenCalledWith('1', expect.any(Function));

      // Extraemos el callback que se pasó como segundo argumento a updateDraft y lo probamos
      const updateCallback = mockStorageService.updateDraft.mock.calls[0][1];

      // Simulamos el estado previo del anteproyecto
      const previousDraftState = { preliminaryDraftId: '1', state: stateList.EN_REVISION } as PreliminaryDraft;

      // Ejecutamos el callback como si fuera el Storage Service interno
      const finalState = updateCallback(previousDraftState);

      // Verificamos que el callback hace el merge correctamente
      expect(finalState.preliminaryDraftId).toBe('1');
      expect(finalState.state).toBe(stateList.APROBADO);
    }));
  });

  describe('deleteDraft', () => {
    it('debería eliminar el anteproyecto después de un delay', fakeAsync(() => {
      let isCompleted = false;

      service.deleteDraft('1').subscribe({
        complete: () => { isCompleted = true; }
      });

      // El storage no debería ser llamado inmediatamente
      expect(mockStorageService.removeDraft).not.toHaveBeenCalled();

      // Avanzamos 800ms
      tick(800);

      expect(mockStorageService.removeDraft).toHaveBeenCalledWith('1');
      expect(isCompleted).toBe(true);
    }));
  });
});
