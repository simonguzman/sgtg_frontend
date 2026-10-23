import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterSpecialRequestFormComponent } from './register-special-request-form.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { SpecialRequestSubmission } from '../../services/thesis-work-special-request.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnCurso } from '../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('RegisterSpecialRequestFormComponent', () => {
  let fixture: ComponentFixture<RegisterSpecialRequestFormComponent>;
  let component: RegisterSpecialRequestFormComponent;
  let notification: { show: jest.Mock };
  let emitted: SpecialRequestSubmission[];

  const crear = (thesis: ThesisWork = thesisWorkDePrueba()) => {
    fixture = TestBed.createComponent(RegisterSpecialRequestFormComponent);
    component = fixture.componentInstance;
    component.thesisWork = thesis;
    emitted = [];
    component.onSaveRequest.subscribe(payload => emitted.push(payload));
    fixture.detectChanges();
  };

  const elegir = (tipo: SpecialRequestType) => {
    component.requestForm.controls.requestType.setValue(tipo);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    notification = { show: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [RegisterSpecialRequestFormComponent],
      providers: [
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: {
          getStudentNames: () => 'Eva Estudiante', getDirectorName: () => 'Dora Directora',
          getCodirectorName: () => '', getAdvisorName: () => ''
        } }
      ]
    }).compileComponents();
  });

  it('ofrece solo las solicitudes disponibles en la etapa', () => {
    crear(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'SUSPENDIDO' })));
    expect(component.requestOptions).toEqual([SpecialRequestType.REANUDACION, SpecialRequestType.CANCELACION]);
  });

  it('sin tipo no envía', () => {
    crear();
    component.submit();
    expect(emitted).toEqual([]);
    expect(component.isFieldInvalid('requestType')).toBe(true);
  });

  it('el campo inválido cambia el borde gris por el de alerta', () => {
    crear();
    const tipo = fixture.nativeElement.querySelector('#requestType') as HTMLSelectElement;
    expect(tipo.classList).toContain('border-gray-300');
    expect(tipo.classList).not.toContain('border-alert');

    component.submit();
    fixture.detectChanges();
    expect(tipo.classList).toContain('border-alert');
    expect(tipo.classList).not.toContain('border-gray-300');
  });

  it('el cambio de título muestra el título y los objetivos vigentes y exige la justificación', () => {
    crear();
    elegir(SpecialRequestType.CAMBIO_TITULO);
    expect((fixture.nativeElement.querySelector('#newTitle') as HTMLInputElement).value).toBe('Sistema de gestión');
    expect(fixture.nativeElement.textContent).toContain('hasta el 20/09/2026');

    component.submit();
    expect(emitted).toEqual([]);
    expect(component.isFieldInvalid('justification')).toBe(true);

    component.requestForm.controls.title.setValue('Nuevo título');
    component.objectives.at(1).setValue('Nuevo específico');
    component.requestForm.controls.justification.setValue('Cambio de alcance');
    component.submit();
    expect(emitted).toEqual([{
      requestType: SpecialRequestType.CAMBIO_TITULO, title: 'Nuevo título',
      objectives: ['Objetivo general', 'Nuevo específico'], justification: 'Cambio de alcance'
    }]);
  });

  it('un objetivo vacío no se envía', () => {
    crear();
    elegir(SpecialRequestType.CAMBIO_TITULO);
    component.addObjective();
    component.requestForm.controls.justification.setValue('J');
    component.submit();
    expect(emitted).toEqual([]);
    expect(component.isObjectiveInvalid(2)).toBe(true);
  });

  it('la prórroga pide los meses y el documento', () => {
    crear();
    elegir(SpecialRequestType.PRORROGA);
    expect(component.requiresDocument).toBe(true);
    component.submit();
    expect(emitted).toEqual([]);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Adjunte el documento de la solicitud en PDF.'
    }));

    const documento = pdf('prorroga.pdf');
    component.handleFileUploaded({ fileName: 'prorroga.pdf', file: documento });
    component.requestForm.controls.months.setValue(3);
    component.submit();
    expect(emitted).toEqual([{ requestType: SpecialRequestType.PRORROGA, months: 3, document: documento }]);
  });

  it.each([SpecialRequestType.SUSPENSION, SpecialRequestType.CANCELACION])('%s pide solo el documento', tipo => {
    crear();
    elegir(tipo);
    const documento = pdf('doc.pdf');
    component.handleFileUploaded({ fileName: 'doc.pdf', file: documento });
    component.submit();
    expect(emitted).toEqual([{ requestType: tipo, document: documento }]);
  });

  it('la reanudación (trabajo suspendido) pide el documento', () => {
    crear(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'SUSPENDIDO' })));
    elegir(SpecialRequestType.REANUDACION);
    const documento = pdf('reanudacion.pdf');
    component.handleFileUploaded({ fileName: 'reanudacion.pdf', file: documento });
    component.submit();
    expect(emitted).toEqual([{ requestType: SpecialRequestType.REANUDACION, document: documento }]);
  });

  it('al cambiar de tipo se descarta el documento elegido', () => {
    crear();
    elegir(SpecialRequestType.SUSPENSION);
    component.handleFileUploaded({ fileName: 'doc.pdf', file: pdf('doc.pdf') });
    elegir(SpecialRequestType.CANCELACION);
    expect(component.document()).toBeNull();
  });
});
