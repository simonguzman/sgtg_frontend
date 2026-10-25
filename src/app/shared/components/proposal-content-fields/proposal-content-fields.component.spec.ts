import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalContentFieldsComponent } from './proposal-content-fields.component';
import { Proposal } from '../../../modules/proposal/interfaces/proposal.interface';

describe('ProposalContentFieldsComponent', () => {
  let fixture: ComponentFixture<ProposalContentFieldsComponent>;

  const textoDe = () => fixture.nativeElement.textContent as string;
  const mostrar = (proposal: Partial<Proposal> | null) => {
    fixture.componentRef.setInput('proposal', proposal);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProposalContentFieldsComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProposalContentFieldsComponent);
  });

  it('muestra cada dato registrado con su etiqueta y los objetivos específicos como lista', () => {
    mostrar({
      description: 'Contexto del trabajo',
      objectives: ['Objetivo G', 'Específico 1', 'Específico 2'],
      lineOfResearch: 'Ingeniería de software',
      organization: 'Empresa S.A.'
    });

    ['Objetivo general', 'Objetivo G', 'Objetivos específicos', 'Descripción', 'Contexto del trabajo',
      'Línea de investigación', 'Ingeniería de software', 'Organización', 'Empresa S.A.']
      .forEach(texto => expect(textoDe()).toContain(texto));
    const items = Array.from(fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLElement>)
      .map(li => li.textContent?.trim());
    expect(items).toEqual(['Específico 1', 'Específico 2']);
  });

  it('omite los opcionales sin registrar y la descripción que solo repite el objetivo general', () => {
    mostrar({ description: 'Objetivo G', objectives: ['Objetivo G'] });

    expect(textoDe()).toContain('Objetivo general');
    ['Objetivos específicos', 'Descripción', 'Línea de investigación', 'Organización']
      .forEach(texto => expect(textoDe()).not.toContain(texto));
  });

  it('sin propuesta no muestra nada', () => {
    mostrar(null);
    expect(textoDe().trim()).toBe('');
  });
});
