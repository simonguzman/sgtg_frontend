import { buildWorkDetailsView, fullName, remainingDaysHint } from './work-details.builder';
import { aPropuesta } from '../../../core/mappers/trabajo-grado.mapper';
import { contextoDePrueba } from '../../../testing/vista-de-prueba';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';
import { User } from '../../../modules/users/interfaces/user.interface';

const propuesta = (overrides: Parameters<typeof crearTrabajoDePrueba>[0] = {}) =>
  aPropuesta(crearTrabajoDePrueba(overrides), contextoDePrueba);

describe('buildWorkDetailsView', () => {
  it('muestra lo obligatorio y deja fuera los campos opcionales que no se registraron', () => {
    const view = buildWorkDetailsView(propuesta({ objetivos: ['Objetivo general'] }), { heading: 'Información', state: 'En revisión' });

    expect(view).toEqual(expect.objectContaining({
      heading: 'Información',
      title: 'Sistema de gestión',
      generalObjective: 'Objetivo general',
      specificObjectives: [],
      description: undefined,
      lineOfResearch: undefined,
      modality: 'Trabajo de investigación',
      state: 'En revisión',
      dates: [],
      documents: []
    }));
    expect(view.participants).toEqual([
      { label: 'Estudiante', value: 'Eva Estudiante' },
      { label: 'Director', value: 'Dora Directora Pérez' }
    ]);
  });

  it('incluye los objetivos específicos, la descripción, la línea, el codirector, el asesor y la organización', () => {
    const view = buildWorkDetailsView(propuesta({
      modalidad: 'PRACTICA_PROFESIONAL',
      objetivos: ['General', 'Específico 1', ' Específico 2 '],
      descripcion: 'Contexto del trabajo',
      lineaInvestigacion: 'Ingeniería de software',
      codirector: { usuarioId: 2, codigo: '1002', nombreCompleto: 'Carlos Codirector', email: 'c@u.co',
        tipoVinculacion: 'PLANTA', departamento: null },
      asesor: { usuarioId: 3, codigo: null, nombreCompleto: 'Ana Asesora', email: 'a@e.co', organizacion: 'Empresa S.A.',
        externo: true }
    }), { heading: 'Información', state: 'Aprobado' });

    expect(view.specificObjectives).toEqual(['Específico 1', 'Específico 2']);
    expect(view.description).toBe('Contexto del trabajo');
    expect(view.lineOfResearch).toBe('Ingeniería de software');
    expect(view.participants.map(p => p.label)).toEqual(['Estudiante', 'Director', 'Codirector', 'Asesor', 'Organización']);
    expect(view.participants.at(-1)?.value).toBe('Empresa S.A.');
  });

  it('agrega los participantes, fechas y documentos de la etapa y omite los vacíos', () => {
    const view = buildWorkDetailsView(propuesta(), {
      heading: 'Información',
      state: 'En revisión',
      extraParticipants: [{ label: 'Evaluadores', value: 'Vera y Walter' }, null],
      dates: [
        { label: 'Fecha de registro', date: '2026-03-02' },
        { label: 'Sin fecha', date: null },
        null
      ],
      documents: [{ name: 'Formato A', description: 'Vigente', url: '/a' }, null, { name: 'Sin URL', description: '', url: '' }]
    });

    expect(view.participants.at(-1)).toEqual({ label: 'Evaluadores', value: 'Vera y Walter' });
    // Las fechas sin hora se leen en hora local (no se corren un día)
    expect(view.dates).toEqual([{ label: 'Fecha de registro', date: new Date(2026, 2, 2), hint: undefined }]);
    expect(view.documents).toEqual([{ name: 'Formato A', description: 'Vigente', url: '/a' }]);
  });

  it('con dos estudiantes la etiqueta va en plural', () => {
    const view = buildWorkDetailsView(propuesta({
      estudiantes: [
        { usuarioId: 10, codigo: '1010', nombreCompleto: 'Eva Estudiante', email: 'e@u.co', programa: null },
        { usuarioId: 11, codigo: '1011', nombreCompleto: 'Iván Estudiante', email: 'i@u.co', programa: null }
      ]
    }), { heading: 'Información', state: 'En revisión' });
    expect(view.participants[0]).toEqual({ label: 'Estudiantes', value: 'Eva Estudiante, Iván Estudiante' });
  });
});

describe('remainingDaysHint', () => {
  it.each([
    [null, undefined],
    [5, 'Quedan 5 días hábiles'],
    [1, 'Queda 1 día hábil'],
    [0, 'Vence hoy'],
    [-1, 'Vencido hace 1 día hábil'],
    [-3, 'Vencido hace 3 días hábiles']
  ])('%s → %s', (dias, texto) => {
    expect(remainingDaysHint(dias)).toBe(texto);
  });
});

describe('fullName', () => {
  it('une los nombres sin espacios repetidos ni partes vacías', () => {
    expect(fullName({ firstName: 'Ana', secondName: ' ', lastName: 'López', secondLastName: 'Gómez' } as User))
      .toBe('Ana López Gómez');
  });
});
