import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ThesisWorkService } from './thesis-work.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { ThesisWorkSustentationService } from './thesis-work-sustentation.service';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { stateList } from '../../../core/enums/state.enum';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('ThesisWorkService (fachada)', () => {
  let service: ThesisWorkService;
  let storage: Record<string, unknown> & { getById: jest.Mock };
  let advance: Record<string, jest.Mock>;
  let specialRequest: Record<string, jest.Mock>;
  let sustentation: Record<string, jest.Mock>;

  beforeEach(() => {
    storage = { thesisWorks: signal([]), allThesisWorks: signal([]), isHydrated: signal(true),
      getById: jest.fn().mockReturnValue(of(undefined)) };
    const devuelve = () => jest.fn().mockReturnValue(of(undefined));
    advance = { radicarInforme: devuelve(), revisarInforme: devuelve() };
    specialRequest = { createSpecialRequest: devuelve(), evaluateSpecialRequest: devuelve() };
    sustentation = {
      requestSustentation: devuelve(), scheduleSustentation: devuelve(), gradeSustentation: devuelve(),
      registerNonAttendance: devuelve(), submitAdjustments: devuelve(), verifyAdjustments: devuelve(),
      uploadFinalVersion: devuelve()
    };
    TestBed.configureTestingModule({
      providers: [
        ThesisWorkService,
        { provide: ThesisWorkStorageService, useValue: storage },
        { provide: ThesisWorkAdvanceService, useValue: advance },
        { provide: ThesisWorkSpecialRequestService, useValue: specialRequest },
        { provide: ThesisWorkSustentationService, useValue: sustentation }
      ]
    });
    service = TestBed.inject(ThesisWorkService);
  });

  it('expone las señales del almacenamiento', () => {
    expect(service.thesisWorks).toBe(storage['thesisWorks']);
    expect(service.allThesisWorks).toBe(storage['allThesisWorks']);
    expect(service.isHydrated).toBe(storage['isHydrated']);
  });

  it('consulta el trabajo en el almacenamiento (vista del backend)', () => {
    service.getThesisWorkById('15');
    expect(storage.getById).toHaveBeenCalledWith('15');
  });

  it('delega los informes mensuales', () => {
    const informe = pdf('informe.pdf');
    service.radicarInforme('15', informe, 'Primer mes');
    service.revisarInforme('15', '1', 'Ajustar', null);
    expect(advance['radicarInforme']).toHaveBeenCalledWith('15', informe, 'Primer mes');
    expect(advance['revisarInforme']).toHaveBeenCalledWith('15', '1', 'Ajustar', null);
  });

  it('delega las solicitudes especiales', () => {
    const solicitud = { requestType: SpecialRequestType.SUSPENSION as const, document: pdf('s.pdf') };
    const request = { id: 'prorroga-0', directorId: '1', requestType: SpecialRequestType.PRORROGA,
      requestDate: new Date(), description: '', status: stateList.EN_REVISION as const };
    const decision = { status: stateList.APROBADO as const, resolutionDetails: '', resolution: pdf('r.pdf') };
    service.createSpecialRequest('15', solicitud);
    service.evaluateSpecialRequest('15', request, decision);
    expect(specialRequest['createSpecialRequest']).toHaveBeenCalledWith('15', solicitud);
    expect(specialRequest['evaluateSpecialRequest']).toHaveBeenCalledWith('15', request, decision);
  });

  it('delega la sustentación', () => {
    const files = { monograph: pdf('m.pdf'), formatE: pdf('e.pdf'), pazYSalvo: pdf('f.pdf') };
    const schedule = { coordinatorId: '30', jurorId: '31', dateTime: '2026-07-15T09:30:00', location: 'Sala 1',
      formatE: pdf('e.pdf') };
    const acta = pdf('acta.pdf');
    const ajustes = pdf('ajustes.pdf');
    const definitiva = pdf('h.pdf');

    service.requestSustentation('15', files);
    service.scheduleSustentation('15', schedule);
    service.gradeSustentation('15', 'APROBADO', '', acta);
    service.registerNonAttendance('15', 'No se presentó');
    service.submitAdjustments('15', ajustes, null);
    service.verifyAdjustments('15', true, '');
    service.uploadFinalVersion('15', definitiva);

    expect(sustentation['requestSustentation']).toHaveBeenCalledWith('15', files);
    expect(sustentation['scheduleSustentation']).toHaveBeenCalledWith('15', schedule);
    expect(sustentation['gradeSustentation']).toHaveBeenCalledWith('15', 'APROBADO', '', acta);
    expect(sustentation['registerNonAttendance']).toHaveBeenCalledWith('15', 'No se presentó');
    expect(sustentation['submitAdjustments']).toHaveBeenCalledWith('15', ajustes, null);
    expect(sustentation['verifyAdjustments']).toHaveBeenCalledWith('15', true, '');
    expect(sustentation['uploadFinalVersion']).toHaveBeenCalledWith('15', definitiva);
  });
});
