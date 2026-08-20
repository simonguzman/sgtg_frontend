import { TestBed } from '@angular/core/testing';
import { signal, Signal } from '@angular/core';
import { of } from 'rxjs';

import { ThesisWorkService } from './thesis-work.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkApiService } from './thesis-work-api.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkDeliveryService } from './thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from './thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { ThesisWorkSustentationService, SustentationVeredict } from './thesis-work-sustentation.service';

import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { SustentationFormData } from '../interfaces/sustentation-form-data.interface';

describe('ThesisWorkService (Facade)', () => {
  let service: ThesisWorkService;

  let storageMock: { thesisWorks: Signal<any[]>; allThesisWorks: Signal<any[]> };
  let apiMock: jest.Mocked<Partial<ThesisWorkApiService>>;
  let advanceMock: jest.Mocked<Partial<ThesisWorkAdvanceService>>;
  let deliveryMock: jest.Mocked<Partial<ThesisWorkDeliveryService>>;
  let evaluationMock: jest.Mocked<Partial<ThesisWorkEvaluationService>>;
  let specialRequestMock: jest.Mocked<Partial<ThesisWorkSpecialRequestService>>;
  let sustentationMock: jest.Mocked<Partial<ThesisWorkSustentationService>>;

  beforeEach(() => {
    storageMock = {
      thesisWorks: signal([]),
      allThesisWorks: signal([])
    };

    apiMock = {
      verifyDeliveryDeadlinesMock: jest.fn().mockReturnValue(of(undefined)),
      getThesisWorkByIdMock: jest.fn().mockReturnValue(of(undefined)),
      reactivateThesisWorkMock: jest.fn().mockReturnValue(of(undefined))
    };

    advanceMock = {
      uploadDocumentMock: jest.fn().mockReturnValue(of(undefined))
    };

    deliveryMock = {
      uploadFinalDeliveryMock: jest.fn().mockReturnValue(of(undefined)),
      uploadCorrectedDocumentsMock: jest.fn().mockReturnValue(of(undefined)),
      registerCorrespondenceDocumentMock: jest.fn().mockReturnValue(of(undefined)),
      registerPazYSalvoMock: jest.fn().mockReturnValue(of(undefined))
    };

    evaluationMock = {
      addEvaluationMock: jest.fn().mockReturnValue(of(undefined))
    };

    specialRequestMock = {
      createSpecialRequestMock: jest.fn().mockReturnValue(of(undefined)),
      evaluateSpecialRequestMock: jest.fn().mockReturnValue(of(undefined))
    };

    sustentationMock = {
      saveSustentationRegistryMock: jest.fn().mockReturnValue(of(undefined)),
      registerSustentationVerdictMock: jest.fn().mockReturnValue(of(undefined)),
      evaluateCorrectedDocumentsMock: jest.fn().mockReturnValue(of(undefined))
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkService,
        { provide: ThesisWorkStorageService, useValue: storageMock },
        { provide: ThesisWorkApiService, useValue: apiMock },
        { provide: ThesisWorkAdvanceService, useValue: advanceMock },
        { provide: ThesisWorkDeliveryService, useValue: deliveryMock },
        { provide: ThesisWorkEvaluationService, useValue: evaluationMock },
        { provide: ThesisWorkSpecialRequestService, useValue: specialRequestMock },
        { provide: ThesisWorkSustentationService, useValue: sustentationMock }
      ]
    });

    service = TestBed.inject(ThesisWorkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Propiedades de Estado', () => {
    it('debe ejecutar verifyDeliveryDeadlinesMock al instanciarse el servicio', () => {
      expect(apiMock.verifyDeliveryDeadlinesMock).toHaveBeenCalledTimes(1);
    });

    it('debe exponer los Signals de almacenamiento expuestos por el StorageService', () => {
      expect(service.thesisWorks).toBe(storageMock.thesisWorks);
      expect(service.allThesisWorks).toBe(storageMock.allThesisWorks);
    });
  });

  describe('Lifecycle', () => {
    it('debe delegar getThesisWorkByIdMock al ApiService', () => {
      service.getThesisWorkByIdMock('thesis-101');
      expect(apiMock.getThesisWorkByIdMock).toHaveBeenCalledWith('thesis-101');
    });

    it('debe delegar reactivateThesisWorkMock al ApiService', () => {
      service.reactivateThesisWorkMock('thesis-101');
      expect(apiMock.reactivateThesisWorkMock).toHaveBeenCalledWith('thesis-101');
    });
  });

  describe('Avances', () => {
    it('debe delegar uploadDocumentMock al AdvanceService', () => {
      const doc = { id: 'doc-1', name: 'Avance.pdf' } as FileDocument;
      const meta = { comments: 'Primer avance' } as CreateAdvanceRequest;

      service.uploadDocumentMock('thesis-101', doc, meta);
      expect(advanceMock.uploadDocumentMock).toHaveBeenCalledWith('thesis-101', doc, meta);
    });
  });

  describe('Entregas', () => {
    it('debe delegar uploadFinalDeliveryMock al DeliveryService', () => {
      const monograph = new File([''], 'monografia.pdf');
      const formatE = new File([''], 'formatoE.pdf');
      const annexes = new File([''], 'anexos.zip');

      service.uploadFinalDeliveryMock('thesis-101', monograph, formatE, annexes);
      expect(deliveryMock.uploadFinalDeliveryMock).toHaveBeenCalledWith('thesis-101', monograph, formatE, annexes);
    });

    it('debe delegar uploadCorrectedDocumentsMock al DeliveryService', () => {
      const monograph = new File([''], 'monografia_v2.pdf');
      const annexes = new File([''], 'anexos_v2.zip');

      service.uploadCorrectedDocumentsMock('thesis-101', monograph, annexes);
      expect(deliveryMock.uploadCorrectedDocumentsMock).toHaveBeenCalledWith('thesis-101', monograph, annexes);
    });

    it('debe delegar registerCorrespondenceDocumentMock al DeliveryService', () => {
      const doc = { id: 'doc-2', name: 'Oficio.pdf' } as FileDocument;

      service.registerCorrespondenceDocumentMock('thesis-101', doc);
      expect(deliveryMock.registerCorrespondenceDocumentMock).toHaveBeenCalledWith('thesis-101', doc);
    });

    it('debe delegar registerPazYSalvoMock al DeliveryService', () => {
      const payload: PazYSalvoPayload = {
        academicApproved: true,
        financialApproved: true
      };
      const file = new File([''], 'paz_y_salvo.pdf');

      service.registerPazYSalvoMock('thesis-101', payload, file);
      expect(deliveryMock.registerPazYSalvoMock).toHaveBeenCalledWith('thesis-101', payload, file);
    });
  });

  describe('Evaluación de avances', () => {
    it('debe delegar addEvaluationMock al EvaluationService', () => {
      const evalData: Evaluation = {
        id: 'eval-1',
        proposalId: 'thesis-101',
        evaluatorId: 'user-1',
        evaluatorName: 'Dr. Evaluador',
        evaluatorRole: UserRoleType.EVALUADOR,
        observations: 'Excelente',
        veredict: stateList.APROBADO,
        date: new Date('2026-08-19')
      };

      service.addEvaluationMock('thesis-101', evalData);
      expect(evaluationMock.addEvaluationMock).toHaveBeenCalledWith('thesis-101', evalData);
    });
  });

  describe('Sustentación', () => {
    it('debe delegar saveSustentationRegistryMock al SustentationService', () => {
      const formData = { location: 'Auditorio A' } as SustentationFormData;

      service.saveSustentationRegistryMock('thesis-101', formData);
      expect(sustentationMock.saveSustentationRegistryMock).toHaveBeenCalledWith('thesis-101', formData);
    });

    it('debe delegar registerSustentationVerdictMock al SustentationService', () => {
      const payload = {
        veredict: stateList.APROBADO as SustentationVeredict,
        observations: 'Aprobado con honores',
        evaluationDate: new Date('2026-08-19')
      };
      const file = new File([''], 'acta.pdf');

      service.registerSustentationVerdictMock('thesis-101', payload, file);
      expect(sustentationMock.registerSustentationVerdictMock).toHaveBeenCalledWith('thesis-101', payload, file);
    });

    it('debe delegar evaluateCorrectedDocumentsMock al SustentationService', () => {
      const evalData: Omit<Evaluation, 'id' | 'date'> = {
        proposalId: 'thesis-101',
        evaluatorId: 'user-1',
        evaluatorName: 'Dr. Evaluador',
        evaluatorRole: UserRoleType.EVALUADOR,
        observations: 'Correcciones aprobadas',
        veredict: stateList.APROBADO
      };
      const file = new File([''], 'formatoG.pdf');

      service.evaluateCorrectedDocumentsMock('thesis-101', evalData, file);
      expect(sustentationMock.evaluateCorrectedDocumentsMock).toHaveBeenCalledWith('thesis-101', evalData, file);
    });
  });

  describe('Solicitudes especiales', () => {
    it('debe delegar createSpecialRequestMock al SpecialRequestService', () => {
      const payload = {
        requestType: SpecialRequestType.PRORROGA,
        comments: 'Extensión de tiempo',
        thesisId: 'thesis-101'
      };

      service.createSpecialRequestMock(payload);
      expect(specialRequestMock.createSpecialRequestMock).toHaveBeenCalledWith(payload);
    });

    it('debe delegar evaluateSpecialRequestMock al SpecialRequestService', () => {
      const payload = {
        status: stateList.APROBADO as stateList.APROBADO | stateList.NO_APROBADO,
        resolutionDetails: 'Resolución aprobada'
      };

      service.evaluateSpecialRequestMock('thesis-101', 'req-50', payload);
      expect(specialRequestMock.evaluateSpecialRequestMock).toHaveBeenCalledWith('thesis-101', 'req-50', payload);
    });
  });
});
