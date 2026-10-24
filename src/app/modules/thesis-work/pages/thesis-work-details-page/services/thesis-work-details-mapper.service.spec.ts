import { TestBed } from '@angular/core/testing';
import { ThesisWorkDetailsMapperService } from './thesis-work-details-mapper.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { crearTrabajoEnCurso, crearTrabajoEnSustentacion } from '../../../../../testing/trabajo-grado-de-prueba';

describe('ThesisWorkDetailsMapperService', () => {
  let mapper: ThesisWorkDetailsMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ThesisWorkDetailsMapperService] });
    mapper = TestBed.inject(ThesisWorkDetailsMapperService);
  });

  describe('mapToView()', () => {
    it('muestra la información registrada del trabajo en curso', () => {
      const view = mapper.mapToView(thesisWorkDePrueba(crearTrabajoEnCurso()));

      expect(view).toEqual(expect.objectContaining({
        heading: 'Información del trabajo de grado',
        title: 'Sistema de gestión',
        generalObjective: 'Objetivo general',
        specificObjectives: ['Objetivo específico'],
        description: undefined,
        lineOfResearch: undefined,
        modality: 'Trabajo de investigación',
        state: 'En desarrollo'
      }));
      expect(view.participants).toEqual([
        { label: 'Estudiante', value: 'Eva Estudiante' },
        { label: 'Director', value: 'Dora Directora Pérez' },
        { label: 'Evaluadores del anteproyecto', value: 'Vera Evaluadora y Walter Evaluador' }
      ]);
    });

    it('incluye las fechas del backend que aplican (las vacías se omiten)', () => {
      const thesisWork = thesisWorkDePrueba(crearTrabajoEnCurso());
      const conFechas = mapper.mapToView(thesisWork);
      expect(conFechas.dates.map(fecha => fecha.label)).toEqual([
        'Inicio del trabajo', 'Fecha máxima de entrega', 'Sustentación desde', 'Límite para cambiar título y objetivos',
        'Límite para solicitar prórroga'
      ]);

      const sinLimites: ThesisWork = {
        ...thesisWork,
        deadlines: { ...thesisWork.deadlines!, objectivesChangeDeadline: null, extensionRequestDeadline: null }
      };
      expect(mapper.mapToView(sinLimites).dates).toHaveLength(3);
    });

    it('muestra la resolución del Consejo y el anteproyecto aprobado', () => {
      const view = mapper.mapToView(thesisWorkDePrueba(crearTrabajoEnCurso()));
      expect(view.documents).toEqual([
        expect.objectContaining({ name: 'Resolución del Consejo',
          description: 'Resolución del Consejo de Facultad que aprobó el anteproyecto' }),
        expect.objectContaining({ name: 'Anteproyecto', description: 'Anteproyecto aprobado' })
      ]);
    });

    it('con la sustentación programada muestra los jurados y señala al coordinador', () => {
      const view = mapper.mapToView(thesisWorkDePrueba(crearTrabajoEnSustentacion()));
      expect(view.participants.at(-1)).toEqual({
        label: 'Jurados de la sustentación', value: 'Juan Coordinador (coordinador) y Julia Jurado'
      });
    });
  });

  describe('Resolución del Consejo', () => {
    it('sin la evaluación del Consejo la toma de los documentos del anteproyecto', () => {
      const thesisWork = thesisWorkDePrueba(crearTrabajoEnCurso());
      const sinEvaluacion: ThesisWork = {
        ...thesisWork,
        preliminaryDraftData: { ...thesisWork.preliminaryDraftData, evaluations: [] }
      };
      expect(mapper.mapToView(sinEvaluacion).documents[0]).toEqual(expect.objectContaining({ name: 'Resolución del Consejo' }));
    });

    it('sin resolución en ninguna parte solo muestra el anteproyecto', () => {
      const thesisWork = thesisWorkDePrueba(crearTrabajoEnCurso());
      const sinResolucion: ThesisWork = {
        ...thesisWork,
        documents: [],
        preliminaryDraftData: {
          ...thesisWork.preliminaryDraftData,
          evaluations: [],
          documents: thesisWork.preliminaryDraftData.documents.filter(document => document.name === 'Anteproyecto')
        }
      };
      expect(mapper.mapToView(sinResolucion).documents.map(document => document.name)).toEqual(['Anteproyecto']);
    });
  });
});
