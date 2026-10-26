import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StatisticsPageFacadeService } from '../pages/statistics-page/services/statistics-page-facade.service';
import { StatisticsStateService } from '../services/statistics-state.service';
import { StatisticsReportService } from '../services/statistics-reports.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { EstadoApi, TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const comite: User = {
  id: '50', idType: IdentificationType.CC, idNumber: 50, firstName: 'Comité', lastName: 'Programa',
  secondLastName: '', codeNumber: 50, email: 'comite@unicauca.edu.co', state: UserState.active,
  roles: [UserRoleType.COMITE]
};

/** Propuesta radicada en la fecha dada con el estado de su versión. */
const propuesta = (id: number, estado: EstadoApi, fechaCarga = '2026-05-01'): TrabajoGradoResponse => {
  const base = crearTrabajoDePrueba({ id });
  return { ...base, propuesta: { ...base.propuesta,
    versiones: base.propuesta.versiones.map(v => ({ ...v, estado, fechaCarga })) } };
};

describe('Integración [Estadísticas]: Ensamblado real de KPIs para el reporte PDF', () => {
  let facade: StatisticsPageFacadeService;
  let state: StatisticsStateService;
  let report: { downloadPdfReport: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    report = { downloadPdfReport: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: StatisticsReportService, useValue: report }
      ]
    });
    facade = TestBed.inject(StatisticsPageFacadeService);
    state = TestBed.inject(StatisticsStateService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('pasa al reporte los KPIs calculados de los trabajos del backend', () => {
    iniciarSesionConTrabajos(comite, [
      propuesta(1, 'APROBADO'), propuesta(2, 'EN_REVISION'), propuesta(3, 'NO_APROBADO')
    ]);

    facade.downloadPdfReport();

    expect(report.downloadPdfReport).toHaveBeenCalledWith(
      state.currentFilters(),
      state.filteredData(),
      { loaded: 3, approved: 1, inProgress: 1, rejected: 1 },
      { scope: state.scope(), directorName: null }
    );
  });

  it('refleja los filtros activos al generar el reporte', () => {
    iniciarSesionConTrabajos(comite, [propuesta(1, 'APROBADO', '2026-05-01'), propuesta(2, 'APROBADO', '2027-02-01')]);
    state.updateFilters({ period: '2026-1' });

    facade.downloadPdfReport();

    const [, datos] = report.downloadPdfReport.mock.calls[0];
    expect(datos.map((dato: { id: string }) => dato.id)).toEqual(['1']);
  });
});
