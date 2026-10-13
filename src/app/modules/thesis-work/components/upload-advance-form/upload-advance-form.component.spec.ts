import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadAdvanceFormComponent } from './upload-advance-form.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnCursoCon, informeDePrueba } from '../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('UploadAdvanceFormComponent', () => {
  let fixture: ComponentFixture<UploadAdvanceFormComponent>;
  let component: UploadAdvanceFormComponent;
  let notification: { show: jest.Mock };
  let emitted: UploadAdvancePayload[];

  beforeEach(async () => {
    notification = { show: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [UploadAdvanceFormComponent],
      providers: [
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: {
          getStudentNames: () => 'Eva Estudiante', getDirectorName: () => 'Dora Directora',
          getCodirectorName: () => '', getAdvisorName: () => ''
        } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UploadAdvanceFormComponent);
    component = fixture.componentInstance;
    component.thesisWork = thesisWorkDePrueba(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1)] }));
    emitted = [];
    component.onSaveAdvance.subscribe(payload => emitted.push(payload));
    fixture.detectChanges();
  });

  it('muestra el número del siguiente informe', () => {
    expect(component.nextReportNumber).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Informe mensual 2');
  });

  it('sin el PDF no envía y avisa', () => {
    component.submit();
    expect(emitted).toEqual([]);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivo requerido' }));
  });

  it('con el PDF envía el archivo y las observaciones (opcionales)', () => {
    const informe = pdf('informe.pdf');
    component.handleFileUploaded({ fileName: 'informe.pdf', file: informe });
    component.advanceForm.controls.comments.setValue('Primer mes');
    component.submit();
    expect(emitted).toEqual([{ comments: 'Primer mes', file: informe }]);
  });

  it('el PDF se puede reemplazar y quitar', () => {
    component.handleFileUploaded({ fileName: 'a.pdf', file: pdf('a.pdf') });
    component.handleFileUploaded({ fileName: 'b.pdf', file: pdf('b.pdf') });
    expect(component.uploadedFile()?.fileName).toBe('b.pdf');
    component.removeFile();
    expect(component.uploadedFile()).toBeNull();
  });

  it('observaciones demasiado largas no se envían', () => {
    component.handleFileUploaded({ fileName: 'a.pdf', file: pdf('a.pdf') });
    component.advanceForm.controls.comments.setValue('x'.repeat(2001));
    component.submit();
    expect(emitted).toEqual([]);
    expect(component.isFieldInvalid('comments')).toBe(true);
  });
});
