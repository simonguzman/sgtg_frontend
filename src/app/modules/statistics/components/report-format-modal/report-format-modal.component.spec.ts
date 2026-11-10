import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ReportFormatModalComponent } from './report-format-modal.component';
import { StatisticsReportFormat } from '../../services/statistics-reports.service';

describe('ReportFormatModalComponent', () => {
  let fixture: ComponentFixture<ReportFormatModalComponent>;
  let component: ReportFormatModalComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReportFormatModalComponent],
      providers: [provideNoopAnimations()]
    });
    fixture = TestBed.createComponent(ReportFormatModalComponent);
    component = fixture.componentInstance;
  });

  it('dice cuántos trabajos lleva el reporte', () => {
    component.rows = 12;
    expect(component.description).toContain('los 12 trabajos');
    component.rows = 1;
    expect(component.description).toContain('el trabajo que dejan');
    component.rows = 0;
    expect(component.description).toContain('no hay trabajos');
  });

  it('para los próximos a vencer cambia el título, el texto y la descripción de los formatos', () => {
    expect(component.title).toBe('Generar reporte');
    component.kind = 'dueSoon';
    component.rows = 3;
    expect(component.title).toBe('Generar reporte de próximos a vencer');
    expect(component.description).toContain('los 3 trabajos de grado próximos a vencer');
    component.rows = 1;
    expect(component.description).toContain('el trabajo de grado próximo a vencer');
    expect(component.options.map(option => option.format)).toEqual(['pdf', 'excel', 'csv']);
    expect(component.options[1].description).toContain('Próximos a vencer');
  });

  it('al elegir un formato lo emite una sola vez y se cierra', () => {
    const elegidos: StatisticsReportFormat[] = [];
    let cierres = 0;
    component.selectFormat.subscribe(formato => elegidos.push(formato));
    component.onClose.subscribe(() => cierres++);

    component.choose('excel');
    component.choose('csv');

    expect(elegidos).toEqual(['excel']);
    expect(cierres).toBe(1);
  });

  it('al abrirse de nuevo se puede volver a elegir', () => {
    component.choose('pdf');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    expect(component.selected).toBe(false);
  });
});
