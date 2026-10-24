import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkDetailsComponent } from './work-details.component';
import { ButtonComponent } from '../button-component/button-component.component';
import { WorkDetailsView } from './work-details.model';

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Output() onClick = new EventEmitter<void>();
}

const vista = (overrides: Partial<WorkDetailsView> = {}): WorkDetailsView => ({
  heading: 'Información de la propuesta',
  title: 'Sistema de gestión',
  generalObjective: 'Objetivo general',
  specificObjectives: [],
  modality: 'Trabajo de investigación',
  state: 'En revisión',
  participants: [{ label: 'Estudiante', value: 'Eva Estudiante' }, { label: 'Director', value: 'Dora Directora' }],
  dates: [],
  documents: [],
  ...overrides
});

describe('WorkDetailsComponent', () => {
  let fixture: ComponentFixture<WorkDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WorkDetailsComponent] })
      .overrideComponent(WorkDetailsComponent, {
        remove: { imports: [ButtonComponent] },
        add: { imports: [MockButtonComponent] }
      })
      .compileComponents();
    fixture = TestBed.createComponent(WorkDetailsComponent);
  });

  const render = (view: WorkDetailsView): string => {
    fixture.componentRef.setInput('view', view);
    fixture.detectChanges();
    return fixture.nativeElement.textContent;
  };

  it('muestra los datos obligatorios y los participantes', () => {
    const texto = render(vista());
    ['Información de la propuesta', 'Sistema de gestión', 'Objetivo general', 'Trabajo de investigación',
      'En revisión', 'Estudiante:', 'Eva Estudiante', 'Director:'].forEach(dato => expect(texto).toContain(dato));
  });

  it('no muestra las secciones opcionales vacías', () => {
    const texto = render(vista());
    ['Objetivos específicos', 'Descripción', 'Línea de investigación', 'Fechas', 'Documentos']
      .forEach(seccion => expect(texto).not.toContain(seccion));
  });

  it('muestra los objetivos específicos, la descripción, la línea, las fechas y los documentos cuando existen', () => {
    const texto = render(vista({
      specificObjectives: ['Específico 1', 'Específico 2'],
      description: 'Contexto',
      lineOfResearch: 'Software',
      dates: [{ label: 'Fecha de registro', date: new Date(2026, 2, 2), hint: 'Radicación' }],
      documents: [{ name: 'Formato A (propuesta)', description: 'Versión vigente', url: '/a' }]
    }));
    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(2);
    ['Contexto', 'Software', 'Fecha de registro', '02/03/2026', 'Radicación', 'Formato A (propuesta)', 'Versión vigente']
      .forEach(dato => expect(texto).toContain(dato));
  });

  it('emite el documento a descargar', () => {
    const documento = { name: 'Formato A', description: 'Vigente', url: '/a' };
    render(vista({ documents: [documento] }));
    const emitido = jest.fn();
    fixture.componentInstance.download.subscribe(emitido);

    fixture.debugElement.query(sel => sel.name === 'app-button-component').componentInstance.onClick.emit();
    expect(emitido).toHaveBeenCalledWith(documento);
  });
});
