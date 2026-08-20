import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
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

  // 🔹 REFACTOR: Tipado estricto estructural en lugar de usar 'as unknown as jest.Mocked<T>'
  let storageSpy: {
    getById: jest.Mock;
    addDraft: jest.Mock;
    updateDraft: jest.Mock;
    removeDraft: jest.Mock;
  };

  let userSpy: {
    users: WritableSignal<Array<{ id: string; roles: UserRoleType[] }>>;
  };

  let eventBusSpy: {
    emit: jest.Mock;
  };

  // 🔹 REFACTOR: Función constructora para crear objetos PreliminaryDraft válidos sin casteo forzado
  const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
    preliminaryDraftId: '1',
    state: stateList.EN_REVISION,
    evaluations: [],
    documents: [],
    createdData: new Date(),
    ...overrides
  } as PreliminaryDraft);
  // Usamos un casteo seguro interno a nivel de fábrica para simular la interfaz
  // sin contaminar el código de las pruebas con tipos parciales o aserciones dobles.

  beforeEach(() => {
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('mocked-uuid') },
      configurable: true
    });

    storageSpy = {
      getById: jest.fn(),
      addDraft: jest.fn(),
      updateDraft: jest.fn(),
      removeDraft: jest.fn()
    };

    userSpy = {
      users: signal([{ id: 'jefe-depto-1', roles: [UserRoleType.JEFE_DEP] }])
    };

    eventBusSpy = {
      emit: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftApiService,
        { provide: PreliminaryDraftStorageService, useValue: storageSpy as unknown as PreliminaryDraftStorageService },
        { provide: UserService, useValue: userSpy as unknown as UserService },
        { provide: EventBusService, useValue: eventBusSpy as unknown as EventBusService }
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
      const mockDraft = createMockDraft({ preliminaryDraftId: '1', state: stateList.EN_REVISION });
      storageSpy.getById.mockReturnValue(of(mockDraft));

      service.getPreliminaryDraftById('1').subscribe((result) => {
        expect(result).toEqual(mockDraft);
        expect(storageSpy.getById).toHaveBeenCalledWith('1');
        done();
      });
    });
  });

  describe('createPreliminaryDraft', () => {
    it('debería crear el anteproyecto, guardar en storage y emitir notificaciones con delay', fakeAsync(() => {
      // 🔹 REFACTOR: Creamos el payload usando la fábrica estricta
      const newDraftPayload = createMockDraft({
        proposalData: {
          title: 'Título de Prueba',
          authors: ['author-1', { id: 'author-2' }],
          director: { id: 'director-1' },
          codirector: { id: 'codirector-1' },
          advisor: { id: 'advisor-1' }
        } as any // Permitido solo si en tu interfaz 'authors' soporta arreglos mixtos
      });

      let resultDraft: PreliminaryDraft | undefined;

      service.createPreliminaryDraft(newDraftPayload).subscribe((res) => {
        resultDraft = res;
      });

      tick(1000);

      expect(resultDraft).toEqual(newDraftPayload);

      expect(storageSpy.addDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          preliminaryDraftId: 'mocked-uuid',
          state: stateList.EN_REVISION,
          evaluations: [],
          documents: []
        })
      );

      expect(eventBusSpy.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_CREATED,
          payload: {
            preliminaryDraftId: 'mocked-uuid',
            preliminaryDraftTitle: 'Título de Prueba'
          }
        })
      );

      // 🔹 REFACTOR: Extraer tipado correcto de la llamada de EventBus
      type EmitParams = Parameters<typeof service['eventBus']['emit']>[0];
      const emitCallArgs = eventBusSpy.emit.mock.calls[0][0] as EmitParams;
      const targetUserIds = emitCallArgs.targetUserIds || [];

      expect(targetUserIds).toContain('author-1');
      expect(targetUserIds).toContain('author-2');
      expect(targetUserIds).toContain('director-1');
      expect(targetUserIds).toContain('codirector-1');
      expect(targetUserIds).toContain('advisor-1');
      expect(targetUserIds).toContain('jefe-depto-1');
    }));
  });

  describe('updatePreliminaryDraft', () => {
    it('debería actualizar el anteproyecto a través del callback del storage con delay', fakeAsync(() => {
      const updatedData = createMockDraft({ state: stateList.APROBADO });

      let resultDraft: PreliminaryDraft | undefined;

      service.updatePreliminaryDraft('1', updatedData).subscribe((res) => {
        resultDraft = res;
      });

      tick(800);

      expect(resultDraft).toEqual(updatedData);

      expect(storageSpy.updateDraft).toHaveBeenCalledWith('1', expect.any(Function));

      // 🔹 REFACTOR: Extraer el callback con Typescript nativo
      type UpdateCallback = (draft: PreliminaryDraft) => PreliminaryDraft;
      const updateCallback = storageSpy.updateDraft.mock.calls[0][1] as UpdateCallback;

      const previousDraftState = createMockDraft({ preliminaryDraftId: '1', state: stateList.EN_REVISION });

      const finalState = updateCallback(previousDraftState);

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

      expect(storageSpy.removeDraft).not.toHaveBeenCalled();

      tick(800);

      expect(storageSpy.removeDraft).toHaveBeenCalledWith('1');
      expect(isCompleted).toBe(true);
    }));
  });
});
