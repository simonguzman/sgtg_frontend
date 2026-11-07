import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvaluateSpecialRequestFormComponent } from './evaluate-special-request-form.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { SpecialRequestDecision } from '../../services/thesis-work-special-request.service';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnCursoCon } from '../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

const thesis = thesisWorkDePrueba(crearTrabajoEnCursoCon({
  cambiosObjetivos: [{ tituloAnterior: 'Sistema de gestión', objetivosAnteriores: ['G'], tituloPropuesto: 'Nuevo título',
    objetivosPropuestos: ['General nuevo', 'Específico nuevo'], justificacion: 'Cambio de alcance',
    fechaSolicitud: '2026-05-01', avalComite: null, decision: null }],
  prorroga: { meses: 2, rutaSolicitud: '15/SOLICITUD_PRORROGA/v1/prorroga.pdf', fechaSolicitud: '2026-04-01',
    decision: null }
}));

describe('EvaluateSpecialRequestFormComponent', () => {
  let fixture: ComponentFixture<EvaluateSpecialRequestFormComponent>;
  let component: EvaluateSpecialRequestFormComponent;
  let notification: { show: jest.Mock };
  let emitted: SpecialRequestDecision[];

  const crear = (request: SpecialRequest) => {
    fixture = TestBed.createComponent(EvaluateSpecialRequestFormComponent);
    component = fixture.componentInstance;
    component.thesisWork = thesis;
    component.specialRequest = request;
    emitted = [];
    component.onSave.subscribe(decision => emitted.push(decision));
    fixture.detectChanges();
  };
  const solicitud = (id: string) => thesis.specialRequests.find(r => r.id === id)!;

  beforeEach(async () => {
    notification = { show: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [EvaluateSpecialRequestFormComponent],
      providers: [
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: {
          getStudentNames: () => 'Eva Estudiante', getDirectorName: () => 'Dora Directora',
          getCodirectorName: () => '', getAdvisorName: () => ''
        } }
      ]
    }).compileComponents();
  });

  it('el cambio de título muestra el título y los objetivos propuestos', () => {
    crear(solicitud('cambio-objetivos-0'));
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Nuevo título');
    expect(texto).toContain('Específico nuevo');
    expect(texto).toContain('Cambio de alcance');
  });

  it('no tiene selector de fecha: las fechas las calcula el backend', () => {
    crear(solicitud('prorroga-0'));
    expect(fixture.nativeElement.querySelector('p-datepicker')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Solicitud de prórroga');
  });

  it('exige la decisión', () => {
    crear(solicitud('prorroga-0'));
    component.submit();
    expect(emitted).toEqual([]);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Falta la decisión' }));
  });

  it('exige la resolución en PDF', () => {
    crear(solicitud('prorroga-0'));
    component.verdictSelected.set(stateList.APROBADO);
    component.submit();
    expect(emitted).toEqual([]);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Resolución requerida' }));
  });

  it('envía la decisión con la resolución y las observaciones', () => {
    crear(solicitud('prorroga-0'));
    const resolucion = pdf('resolucion.pdf');
    component.verdictSelected.set(stateList.NO_APROBADO);
    component.handleResolutionUploaded({ fileName: 'resolucion.pdf', file: resolucion });
    const textarea = fixture.nativeElement.querySelector('#evalComments') as HTMLTextAreaElement;
    textarea.value = 'No procede';
    textarea.dispatchEvent(new Event('input'));
    component.submit();
    expect(emitted).toEqual([{ status: stateList.NO_APROBADO, resolutionDetails: 'No procede', resolution: resolucion }]);
  });

  describe('concepto de pertinencia del Comité sobre el cambio de título y objetivos', () => {
    it('si espera el concepto del Comité, el formulario es el de pertinencia', () => {
      crear(solicitud('cambio-objetivos-0'));
      const texto = fixture.nativeElement.textContent as string;
      expect(component.isCommitteeStep).toBe(true);
      expect(texto).toContain('Concepto de pertinencia');
      expect(texto).toContain('Pertinente');
      expect(texto).toContain('No pertinente');
      expect(texto).not.toContain('Avalar');
      // los objetivos propuestos se muestran como los demás campos (como en las vistas de detalle)
      const etiquetas = Array.from(fixture.nativeElement.querySelectorAll('app-readonly-field'))
        .map(campo => (campo as HTMLElement).getAttribute('label') ?? (campo as HTMLElement).textContent ?? '');
      expect(etiquetas.join('|')).toContain('Objetivo general propuesto');
      expect(etiquetas.join('|')).toContain('Objetivos específicos propuestos');
      expect(fixture.nativeElement.querySelector('ol.list-decimal')).toBeNull();
      expect(texto).toContain('Acta o concepto del Comité (PDF, opcional)');
      expect(texto).not.toContain('Decisión del Consejo de Facultad');
    });

    it('pertinente sin acta: el acta es opcional', () => {
      crear(solicitud('cambio-objetivos-0'));
      component.verdictSelected.set(stateList.APROBADO);
      component.submit();
      expect(emitted).toEqual([{ status: stateList.APROBADO, resolutionDetails: '', resolution: null }]);
    });

    it('si no es pertinente, exige las observaciones', () => {
      crear(solicitud('cambio-objetivos-0'));
      component.verdictSelected.set(stateList.NO_APROBADO);
      component.submit();
      expect(emitted).toEqual([]);
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Observaciones requeridas' }));

      component.observations.set('No corresponde al programa');
      component.submit();
      expect(emitted).toEqual([
        { status: stateList.NO_APROBADO, resolutionDetails: 'No corresponde al programa', resolution: null }
      ]);
    });

    it('el Consejo ve el concepto de pertinencia del Comité y debe adjuntar la resolución', () => {
      const avalado = thesisWorkDePrueba(crearTrabajoEnCursoCon({
        cambiosObjetivos: [{ tituloAnterior: 'Sistema de gestión', objetivosAnteriores: ['G'],
          tituloPropuesto: 'Nuevo título', objetivosPropuestos: ['General nuevo'], justificacion: 'Cambio de alcance',
          fechaSolicitud: '2026-05-01', decision: null,
          avalComite: { organo: 'COMITE_PROGRAMA', resultado: 'APROBADO', acta: null,
            rutaArchivo: '15/AVAL_CAMBIO_OBJETIVOS/v1/aval.pdf', observaciones: 'Pertinente', fecha: '2026-05-04' } }]
      }));
      crear(avalado.specialRequests.find(r => r.id === 'cambio-objetivos-0')!);
      const texto = fixture.nativeElement.textContent as string;
      expect(component.isCommitteeStep).toBe(false);
      expect(texto).toContain('Decisión del Consejo de Facultad');
      expect(texto).toContain('Pertinente el 04 - 05 - 2026');
      expect(texto).toContain('Pertinente');
      expect(texto).toContain('Concepto de pertinencia del Comité sobre el cambio de título y objetivos');

      component.verdictSelected.set(stateList.APROBADO);
      component.submit();
      expect(emitted).toEqual([]);
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Resolución requerida' }));
    });
  });

  it('emite la descarga del documento de la solicitud', () => {
    crear(solicitud('prorroga-0'));
    const descargas: unknown[] = [];
    component.onDownloadDocument.subscribe(d => descargas.push(d));
    (fixture.nativeElement.querySelector('app-button-component button') as HTMLButtonElement).click();
    expect(descargas).toEqual([expect.objectContaining({ name: 'Solicitud de prórroga' })]);
  });
});
