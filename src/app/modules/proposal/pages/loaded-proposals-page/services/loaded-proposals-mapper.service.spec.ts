import { TestBed } from '@angular/core/testing';
import { LoadedProposalsMapperService } from './loaded-proposals-mapper.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

describe('LoadedProposalsMapperService', () => {
  let service: LoadedProposalsMapperService;
  const formatoA: FileDocument = {
    id: '15/TI-A/v1/Formato A - v1.pdf',
    name: 'Formato A (propuesta)',
    url: '/api/v1/sgtg/trabajos-grado/15/archivos?ruta=a',
    uploadDate: '08 - 08 - 2026',
    type: DocumentType.PROPUESTA,
    status: stateList.EN_REVISION,
    version: 1
  };
  const carta: FileDocument = {
    id: '15/CARTA_ACEPTACION/v1/Carta de aceptacion - v1.pdf',
    name: 'Carta de aceptación',
    url: '/api/v1/sgtg/trabajos-grado/15/archivos?ruta=c',
    uploadDate: '08 - 08 - 2026',
    type: DocumentType.FORMATO,
    version: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoadedProposalsMapperService] });
    service = TestBed.inject(LoadedProposalsMapperService);
  });

  describe('Método: mapRegistrationToRow', () => {
    it('una versión muestra su número, el estado de su revisión y sus documentos', () => {
      const row = service.mapRegistrationToRow(formatoA, [], true, false, false);
      expect(row).toEqual(expect.objectContaining({
        id: formatoA.id, name: 'Formato A (propuesta)', version: 1, status: stateList.EN_REVISION,
        documents: [formatoA]
      }));
    });

    it('el registro inicial de una práctica agrupa el formato A y la carta de aceptación', () => {
      const row = service.mapRegistrationToRow(formatoA, [carta], true, false, false);
      expect(row.name).toBe('Formato A (propuesta) y carta de aceptación');
      expect(row.documents).toEqual([formatoA, carta]);
    });

    it('formatea la fecha de carga para mostrarla en la tabla', () => {
      const row = service.mapRegistrationToRow({ ...formatoA, uploadDate: new Date(2026, 6, 21) }, [], true, false, false);
      expect(row.uploadDate).toBe('21 - 07 - 2026');
    });

    it('un registro sin formato A no muestra versión ni estado', () => {
      const row = service.mapRegistrationToRow(carta, [], false, true, false);
      expect(row.version).toBeUndefined();
      expect(row.status).toBeUndefined();
      expect(row.allowedActions).toEqual(['view-details']);
    });

    it('siempre permite ver los detalles; evaluar solo al Comité, en revisión y sin archivar', () => {
      expect(service.mapRegistrationToRow(formatoA, [], true, false, false).allowedActions).toEqual(['view-details']);
      expect(service.mapRegistrationToRow(formatoA, [], true, true, false).allowedActions)
        .toEqual(['view-details', 'evaluate']);
      expect(service.mapRegistrationToRow({ ...formatoA, status: stateList.APROBADO }, [], true, true, false)
        .allowedActions).toEqual(['view-details']);
      expect(service.mapRegistrationToRow(formatoA, [], true, true, true).allowedActions).toEqual(['view-details']);
    });
  });
});
