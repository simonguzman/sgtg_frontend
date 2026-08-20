import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';

import { ThesisWorkDeliveryService } from './thesis-work-delivery.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { UserService } from '../../users/services/user.service';

import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

// Importamos las interfaces necesarias para el tipado
import { User } from '../../users/interfaces/user.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';

// Imports de helpers y utils que vamos a espiar (spyOn)
import * as fileReaderUtils from '../../../core/utils/file-reader.utils';
import * as thesisDateHelper from '../helpers/thesis-date.helper';
import * as participantsHelper from '../helpers/thesis-participants.helper';

describe('ThesisWorkDeliveryService', () => {
  let service: ThesisWorkDeliveryService;

  // 1. Tipamos los mocks explícitamente definiendo solo lo que la prueba usa
  let storageMock: {
    updateWork: jest.Mock<void, [string, (work: ThesisWork) => ThesisWork]>
  };

  let eventBusMock: {
    emit: jest.Mock
  };

  let userServiceMock: {
    users: WritableSignal<Partial<User>[]>;
    removeRolesFromUsersMock: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();

    const mockId = '00000000-0000-0000-0000-000000000000' as `${string}-${string}-${string}-${string}-${string}`;

    // 2. Quitamos el 'any' usando Object.defineProperty para modificar objetos globales de forma segura
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: { randomUUID: () => mockId }
      });
    } else if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = () => mockId;
    }

    // 3. Inicializamos los mocks con sus tipos correctos
    storageMock = {
      updateWork: jest.fn((id: string, callback: (work: ThesisWork) => ThesisWork) => {
        // Casteamos este objeto simulado como ThesisWork para no tener que
        // mockear las 30 propiedades extra que exige la interfaz original
        const mockThesis = {
          thesisWorkId: id,
          preliminaryDraftData: {
            proposalData: { title: 'Tesis de prueba' },
            evaluators: [{ id: 'eval1' }]
          },
          sustentations: [{ assignedJurors: [{ id: 'juror1' }] }],
          finalDeliveries: [],
          documents: []
        } as unknown as ThesisWork;

        callback(mockThesis);
      })
    };

    eventBusMock = {
      emit: jest.fn()
    };

    userServiceMock = {
      users: signal<Partial<User>[]>([
        { id: 'consejo1', roles: [UserRoleType.CONSEJO] },
        { id: 'decano1', roles: [UserRoleType.DECANATURA] }
      ]),
      removeRolesFromUsersMock: jest.fn().mockReturnValue(of(undefined))
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkDeliveryService,
        // 4. Inyectamos usando el patrón "as unknown as [Service]" para que Angular lo
        // acepte sin quejarse de que al mock le faltan los demás métodos de la clase real.
        { provide: ThesisWorkStorageService, useValue: storageMock as unknown as ThesisWorkStorageService },
        { provide: EventBusService, useValue: eventBusMock as unknown as EventBusService },
        { provide: UserService, useValue: userServiceMock as unknown as UserService }
      ]
    });

    service = TestBed.inject(ThesisWorkDeliveryService);

    jest.spyOn(fileReaderUtils, 'readFileAsDataUrl').mockResolvedValue('data:application/pdf;base64,mock');
    jest.spyOn(thesisDateHelper, 'formatThesisDate').mockReturnValue('2023-10-25');
    jest.spyOn(participantsHelper, 'collectParticipantIds').mockReturnValue(['student1', 'director1']);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const flushPromises = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  it('debería subir la entrega final exitosamente (uploadFinalDeliveryMock)', async () => {
    const monograph = new File([''], 'monografia.pdf');
    const formatE = new File([''], 'formatoE.pdf');

    const promise = firstValueFrom(service.uploadFinalDeliveryMock('thesis-1', monograph, formatE));

    await flushPromises();
    jest.advanceTimersByTime(1000);

    await promise;

    expect(fileReaderUtils.readFileAsDataUrl).toHaveBeenCalledTimes(2);
    expect(storageMock.updateWork).toHaveBeenCalledWith('thesis-1', expect.any(Function));
    expect(eventBusMock.emit).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.THESIS_FINAL_DELIVERY_UPLOADED,
      targetUserIds: expect.arrayContaining(['student1', 'director1', 'decano1']),
      payload: { thesisId: 'thesis-1', thesisTitle: 'Tesis de prueba' }
    }));
  });

  it('debería registrar el paz y salvo exitosamente (registerPazYSalvoMock)', async () => {
    const file = new File([''], 'pazysalvo.pdf');
    const payload = { academicApproved: true, financialApproved: true };

    const promise = firstValueFrom(service.registerPazYSalvoMock('thesis-1', payload, file));

    await flushPromises();
    jest.advanceTimersByTime(1000);

    await promise;

    expect(storageMock.updateWork).toHaveBeenCalled();
    expect(eventBusMock.emit).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED,
      targetUserIds: expect.arrayContaining(['student1', 'director1', 'consejo1']),
      payload: { thesisId: 'thesis-1', thesisTitle: 'Tesis de prueba', isApproved: true }
    }));
  });

  it('debería subir documentos corregidos exitosamente (uploadCorrectedDocumentsMock)', async () => {
    const monograph = new File([''], 'monografia-corregida.pdf');

    const promise = firstValueFrom(service.uploadCorrectedDocumentsMock('thesis-1', monograph));

    await flushPromises();
    jest.advanceTimersByTime(1000);

    await promise;

    expect(storageMock.updateWork).toHaveBeenCalled();
    expect(eventBusMock.emit).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED,
      targetUserIds: expect.arrayContaining(['juror1'])
    }));
  });

  it('debería registrar un documento de correspondencia exitosamente (registerCorrespondenceDocumentMock)', async () => {
    const doc = {
      id: 'doc-1',
      name: 'carta',
      url: 'url-valida',
      uploadDate: 'date',
      type: DocumentType.FORMATO_H,
      status: stateList.APROBADO
    };

    const promise = firstValueFrom(service.registerCorrespondenceDocumentMock('thesis-1', doc));

    await flushPromises();
    jest.advanceTimersByTime(800);

    await promise;

    expect(storageMock.updateWork).toHaveBeenCalled();
    expect(userServiceMock.removeRolesFromUsersMock).toHaveBeenCalledWith(['eval1'], [UserRoleType.EVALUADOR]);
    expect(userServiceMock.removeRolesFromUsersMock).toHaveBeenCalledWith(['juror1'], [UserRoleType.JURADO]);
    expect(eventBusMock.emit).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.THESIS_CORRESPONDENCE_REGISTERED
    }));
  });
});
