import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadFinalDeliveryFormComponent } from './upload-final-delivery-form.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { SustentationRequestFiles } from '../../services/thesis-work-sustentation.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnCurso } from '../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('UploadFinalDeliveryFormComponent (solicitud de sustentación)', () => {
  let fixture: ComponentFixture<UploadFinalDeliveryFormComponent>;
  let component: UploadFinalDeliveryFormComponent;
  let notification: { show: jest.Mock };
  let emitted: SustentationRequestFiles[];

  const crear = (thesis: ThesisWork = thesisWorkDePrueba()) => {
    fixture = TestBed.createComponent(UploadFinalDeliveryFormComponent);
    component = fixture.componentInstance;
    component.thesisWork = thesis;
    emitted = [];
    component.onSaveDelivery.subscribe(files => emitted.push(files));
    fixture.detectChanges();
  };

  const adjuntar = (slot: Parameters<UploadFinalDeliveryFormComponent['openModal']>[0], nombre: string) => {
    const file = pdf(nombre);
    component.openModal(slot);
    component.handleFileUploaded({ fileName: nombre, file });
    return file;
  };

  beforeEach(async () => {
    notification = { show: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [UploadFinalDeliveryFormComponent],
      providers: [
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: {
          getStudentNames: () => 'Eva Estudiante', getDirectorName: () => 'Dora Directora',
          getCodirectorName: () => '', getAdvisorName: () => ''
        } }
      ]
    }).compileComponents();
  });

  it('en investigación pide monografía y formato E (el paz y salvo lo revisa Decanatura); los anexos son opcionales', () => {
    crear();
    expect(component['slots'].map(s => [s.key, s.required])).toEqual([
      ['MONOGRAPH', true], ['FORMAT_E', true], ['ANNEXES', false]
    ]);
  });

  it('en práctica profesional pide además el concepto del asesor', () => {
    crear(thesisWorkDePrueba(crearTrabajoEnCurso({ modalidad: 'PRACTICA_PROFESIONAL' })));
    expect(component['slots'].find(s => s.key === 'ADVISOR_CONCEPT')?.required).toBe(true);
  });

  it('sin los obligatorios no envía y marca los faltantes', () => {
    crear();
    adjuntar('MONOGRAPH', 'monografia.pdf');
    component.submit();
    expect(emitted).toEqual([]);
    expect(component.isMissing('FORMAT_E')).toBe(true);
    expect(component.isMissing('ANNEXES')).toBe(false);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Documentos faltantes' }));
  });

  it('con los obligatorios envía la solicitud (con o sin anexos)', () => {
    crear();
    const monografia = adjuntar('MONOGRAPH', 'monografia.pdf');
    const formatoE = adjuntar('FORMAT_E', 'formato-e.pdf');
    component.submit();
    expect(emitted).toEqual([{ monograph: monografia, formatE: formatoE, advisorConcept: null, annexes: null }]);

    const anexos = adjuntar('ANNEXES', 'anexos.pdf');
    component.submit();
    expect(emitted[1].annexes).toBe(anexos);
  });

  it('un documento se puede quitar', () => {
    crear();
    adjuntar('MONOGRAPH', 'monografia.pdf');
    component.removeFile('MONOGRAPH');
    expect(component.uploaded()['MONOGRAPH']).toBeUndefined();
  });

  it('el modal muestra el documento que se está cargando', () => {
    crear();
    component.openModal('FORMAT_E');
    expect(component.activeSlot()?.label).toBe('Formato E');
    component.closeModal();
    expect(component.activeModal()).toBeNull();
  });
});
