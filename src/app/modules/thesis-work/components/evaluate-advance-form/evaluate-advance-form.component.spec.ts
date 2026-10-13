import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvaluateAdvanceFormComponent } from './evaluate-advance-form.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnCursoCon, informeDePrueba, revisionDePrueba } from '../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('EvaluateAdvanceFormComponent', () => {
  let fixture: ComponentFixture<EvaluateAdvanceFormComponent>;
  let component: EvaluateAdvanceFormComponent;
  let notification: { show: jest.Mock };
  let emitted: SubmitAdvanceEvaluationPayload[];

  const thesis = thesisWorkDePrueba(crearTrabajoEnCursoCon({
    informesMensuales: [
      informeDePrueba(1, { observaciones: 'Primer mes', revisiones: [revisionDePrueba()] }),
      informeDePrueba(2)
    ]
  }));

  const crear = (advanceId: string, alreadyEvaluated = false) => {
    fixture = TestBed.createComponent(EvaluateAdvanceFormComponent);
    component = fixture.componentInstance;
    component.thesisWork = thesis;
    component.advanceData = thesis.advances!.find(a => a.id === advanceId)!;
    fixture.componentRef.setInput('alreadyEvaluated', alreadyEvaluated);
    emitted = [];
    component.onSaveEvaluation.subscribe(payload => emitted.push(payload));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    notification = { show: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [EvaluateAdvanceFormComponent],
      providers: [
        { provide: NotificationService, useValue: notification },
        { provide: ThesisParticipantsFormatterService, useValue: {
          getStudentNames: () => 'Eva Estudiante', getDirectorName: () => 'Dora Directora',
          getCodirectorName: () => '', getAdvisorName: () => ''
        } }
      ]
    }).compileComponents();
  });

  it('muestra el informe y las revisiones registradas', () => {
    crear('1');
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Informe mensual 1');
    expect(texto).toContain('Primer mes');
    expect(component.reviews.map(r => r.evaluatorName)).toEqual(['Dora Directora Pérez']);
    expect(texto).toContain('Ajustar el cronograma');
  });

  it('una revisión vacía no se envía', () => {
    crear('2');
    component.submit();
    expect(emitted).toEqual([]);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Revisión vacía' }));
  });

  it('envía solo observaciones', () => {
    crear('2');
    component.evaluationForm.controls.comments.setValue('Bien');
    component.submit();
    expect(emitted).toEqual([{ comments: 'Bien', notes: null }]);
  });

  it('envía solo el PDF de notas', () => {
    crear('2');
    const notas = pdf('notas.pdf');
    component.handleFeedbackUploaded({ fileName: 'notas.pdf', file: notas });
    component.submit();
    expect(emitted).toEqual([{ comments: '', notes: notas }]);
    component.removeFeedbackFile();
    expect(component.notesFile()).toBeNull();
  });

  it('si el usuario ya revisó, el formulario no se muestra y queda deshabilitado', () => {
    crear('1', true);
    expect(component.isReadOnly).toBe(true);
    expect(component.evaluationForm.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Guardar revisión');
  });

  it('emite la descarga del informe y de las notas', () => {
    crear('1');
    const descargas: unknown[] = [];
    component.onDownloadAdvance.subscribe(d => descargas.push(d));
    component.onDownloadNotes.subscribe(d => descargas.push(d));
    const botones = Array.from(fixture.nativeElement.querySelectorAll('app-button-component button')) as HTMLButtonElement[];
    botones.find(b => b.textContent?.includes('Descargar notas'))?.click();
    botones.find(b => b.textContent?.trim() === 'Descargar')?.click();
    expect(descargas).toHaveLength(2);
  });
});
