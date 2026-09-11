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

  // 🔹 REFACTOR: Tipado estricto estructural (ya no usaremos 'as unknown' en los providers)
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

  // 🔹 REFACTOR: Función constructora para crear objetos PreliminaryDraft válidos
  const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
    preliminaryDraftId: '1',
    state: stateList.EN_REVISION,
    evaluations: [],
    documents: [],
    createdData: new Date(),
    ...overrides
  } as PreliminaryDraft);

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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
        // 🔹 REFACTOR: Asignación directa limpia. TypeScript acepta la estructura.
        { provide: PreliminaryDraftStorageService, useValue: storageSpy },
        { provide: UserService, useValue: userSpy },
        { provide: EventBusService, useValue: eventBusSpy }
      ]
    });

    service = TestBed.inject(PreliminaryDraftApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar las implementaciones de la consola
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

      // 🔹 REFACTOR: Eliminado el `as any`. Usamos directamente un casteo al tipo real de
      // proposalData aprovechando la utilidad NonNullable.
      const newDraftPayload = createMockDraft({
        proposalData: {
          title: 'Título de Prueba',
          authors: [{ id: 'author-1' }, { id: 'author-2' }],
          director: { id: 'director-1' },
          codirector: { id: 'codirector-1' },
          advisor: { id: 'advisor-1' }
        } as NonNullable<PreliminaryDraft['proposalData']>
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
