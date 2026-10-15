import {
  aAnteproyecto, aFecha, aPropuesta, aTrabajoDeGrado, aUsuario, ContextoMapeo, estadoAnteproyecto, estadoTrabajo,
  nombreDeRuta, tipoDocumento, veredicto
} from './trabajo-grado.mapper';
import {
  crearTrabajoConAnteproyectoRadicado, crearTrabajoDePrueba, crearTrabajoEnAnteproyecto, crearTrabajoEnCurso,
  crearTrabajoEnCursoCon, crearTrabajoEnSustentacion, informeDePrueba, revisionDePrueba, sustentacionDePrueba
} from '../../testing/trabajo-grado-de-prueba';
import { SpecialRequestType } from '../../modules/thesis-work/enums/special-request-type.enum';
import { SustentationStatus } from '../../modules/thesis-work/enums/sustentation-status.enum';
import { stateList } from '../enums/state.enum';
import { DocumentType } from '../enums/document-type.enum';
import { UserRoleType } from '../enums/user-role-type.enum';
import { Modality } from '../../modules/proposal/enums/modality.enum';
import { User } from '../../modules/users/interfaces/user.interface';
import { UserState } from '../../modules/users/enum/user-state.enum';
import { IdentificationType } from '../../modules/users/enum/identification-type.enum';

const directoraConocida: User = {
  id: '1', idType: IdentificationType.CC, idNumber: 1061, firstName: 'Dora', secondName: '', lastName: 'Directora',
  secondLastName: 'Pérez', codeNumber: 1001, roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR],
  email: 'dora@unicauca.edu.co', state: UserState.active
};

const ctx: ContextoMapeo = {
  usuarios: new Map([['1', directoraConocida]]),
  urlArchivo: (id, ruta) => `/api/v1/sgtg/trabajos-grado/${id}/archivos?ruta=${encodeURIComponent(ruta)}`
};

describe('trabajo-grado.mapper', () => {
  describe('propuesta', () => {
    it('se construye con el id del trabajo, sus participantes y la versión radicada', () => {
      const propuesta = aPropuesta(crearTrabajoDePrueba(), ctx);

      expect(propuesta.id).toBe('15');
      expect(propuesta.title).toBe('Sistema de gestión');
      // Sin descripción, se muestra el objetivo general
      expect(propuesta.description).toBe('Objetivo general');
      expect(propuesta.objectives).toEqual(['Objetivo general', 'Objetivo específico']);
      expect(propuesta.modality).toBe(Modality.TI);
      expect(propuesta.state).toBe(stateList.EN_REVISION);
      expect(propuesta.director).toBe(directoraConocida);
      expect(propuesta.authors[0]).toEqual(expect.objectContaining({ id: '10', firstName: 'Eva', lastName: 'Estudiante' }));
      expect(propuesta.documents).toEqual([expect.objectContaining({
        id: '15/TI-A/v1/propuesta.pdf',
        name: 'propuesta',
        type: DocumentType.PROPUESTA,
        url: '/api/v1/sgtg/trabajos-grado/15/archivos?ruta=15%2FTI-A%2Fv1%2Fpropuesta.pdf'
      })]);
      expect(propuesta.evaluationDeadline).toEqual(new Date(2026, 2, 16));
      expect(propuesta.isArchived).toBe(false);
    });

    it('usa la descripción y la línea de investigación si las tiene', () => {
      const propuesta = aPropuesta(crearTrabajoDePrueba({ descripcion: 'Plataforma web', lineaInvestigacion: 'IA' }), ctx);
      expect(propuesta.description).toBe('Plataforma web');
      expect(propuesta.lineOfResearch).toBe('IA');
    });

    it('la decisión del Comité es su evaluación y define el estado', () => {
      const propuesta = aPropuesta(crearTrabajoEnAnteproyecto(), ctx);

      expect(propuesta.state).toBe(stateList.APROBADO);
      expect(propuesta.evaluations).toEqual([expect.objectContaining({
        evaluatorName: 'Comité de Programa',
        evaluatorRole: UserRoleType.COMITE,
        veredict: stateList.APROBADO,
        signedDocuments: [expect.objectContaining({ name: 'acta' })]
      })]);
    });

    it('el estado es de cada versión y el de la propuesta es el de la última', () => {
      const base = crearTrabajoDePrueba();
      const propuesta = aPropuesta(crearTrabajoDePrueba({
        propuesta: {
          ...base.propuesta,
          versiones: [
            { ...base.propuesta.versiones[0], estado: 'NO_APROBADO' },
            { ...base.propuesta.versiones[0], ruta: '15/TI-A/v2/propuesta.pdf', version: 2, estado: 'EN_REVISION' }
          ]
        }
      }), ctx);

      expect(propuesta.state).toBe(stateList.EN_REVISION);
      expect(propuesta.documents.map(documento => documento.status))
        .toEqual([stateList.NO_APROBADO, stateList.EN_REVISION]);
    });

    it('sin versiones radicadas la propuesta no tiene anteproyecto', () => {
      const base = crearTrabajoDePrueba();
      expect(aAnteproyecto(crearTrabajoDePrueba({ propuesta: { ...base.propuesta, versiones: [] } }), ctx)).toBeNull();
    });

    it('una práctica profesional incluye la carta de aceptación y su asesor', () => {
      const propuesta = aPropuesta(crearTrabajoDePrueba({
        modalidad: 'PRACTICA_PROFESIONAL',
        asesor: { usuarioId: null, codigo: null, nombreCompleto: 'Ana Asesora', email: 'ana@empresa.com',
          organizacion: 'Empresa', externo: true },
        cartaAceptacion: { tipo: 'CARTA_ACEPTACION', formato: null, ruta: '15/CARTA_ACEPTACION/v1/carta.pdf',
          version: 1, fechaCarga: '2026-03-01' }
      }), ctx);

      expect(propuesta.modality).toBe(Modality.PP);
      expect(propuesta.organization).toBe('Empresa');
      expect(propuesta.advisor).toEqual(expect.objectContaining({ id: 'externo:ana@empresa.com', firstName: 'Ana' }));
      expect(propuesta.documents.map(d => d.name)).toEqual(['propuesta', 'carta']);
    });

    it('queda archivada y cancelada si el trabajo se cancela durante la propuesta', () => {
      const propuesta = aPropuesta(crearTrabajoDePrueba({ etapa: 'CANCELADO' }), ctx);
      expect(propuesta.isArchived).toBe(true);
      expect(propuesta.state).toBe(stateList.CANCELADO);
    });
  });

  describe('anteproyecto', () => {
    it('no existe mientras la propuesta no esté aprobada', () => {
      expect(aAnteproyecto(crearTrabajoDePrueba(), ctx)).toBeNull();
    });

    it('no existe hasta que el director radica la primera versión', () => {
      expect(aAnteproyecto(crearTrabajoEnAnteproyecto(), ctx)).toBeNull();
    });

    it('existe con la primera versión radicada y comparte el id del trabajo', () => {
      const anteproyecto = aAnteproyecto(crearTrabajoConAnteproyectoRadicado(), ctx)!;
      expect(anteproyecto.preliminaryDraftId).toBe('15');
      expect(anteproyecto.proposalId).toBe('15');
      expect(anteproyecto.proposalData.id).toBe('15');
      expect(anteproyecto.state).toBe(stateList.EN_REVISION);
      // Fecha de radicación de la primera versión
      expect(anteproyecto.createdData).toEqual(new Date(2026, 2, 9));
    });

    it('incluye evaluadores, conceptos con su formato B y la resolución del Consejo', () => {
      const anteproyecto = aAnteproyecto(crearTrabajoEnCurso(), ctx)!;

      expect(anteproyecto.evaluators?.map(e => e.id)).toEqual(['20', '21']);
      expect(anteproyecto.evaluations).toHaveLength(3);
      expect(anteproyecto.evaluations[0]).toEqual(expect.objectContaining({
        evaluatorId: '20', evaluatorRole: UserRoleType.EVALUADOR, veredict: stateList.APROBADO,
        documentId: '15/ANTEPROYECTO/v1/anteproyecto.pdf',
        signedDocuments: [expect.objectContaining({ name: 'formato-b' })]
      }));
      expect(anteproyecto.evaluations[2].evaluatorRole).toBe(UserRoleType.CONSEJO);
      expect(anteproyecto.documents.map(d => d.type))
        .toEqual([DocumentType.ANTEPROYECTO, DocumentType.FORMATO_C, DocumentType.RESOLUCION]);
      // La remisión aprobada por el Consejo
      expect(anteproyecto.documents[1]).toEqual(expect.objectContaining({ version: 1, status: stateList.APROBADO }));
      expect(anteproyecto.maximumDeliveryDate).toEqual(new Date(2026, 11, 20));
    });
  });

  describe('trabajo de grado', () => {
    it('no existe hasta que el Consejo aprueba el anteproyecto', () => {
      expect(aTrabajoDeGrado(crearTrabajoEnAnteproyecto(), ctx)).toBeNull();
    });

    it('existe con la ejecución y lleva el anteproyecto y la propuesta', () => {
      const trabajo = aTrabajoDeGrado(crearTrabajoEnCurso(), ctx)!;
      expect(trabajo.thesisWorkId).toBe('15');
      expect(trabajo.preliminaryDraftData.state).toBe(stateList.APROBADO);
      expect(trabajo.state).toBe(stateList.EN_DESARROLLO);
      expect(trabajo.createdDate).toEqual(new Date(2026, 2, 20));
    });

    it('las tres vistas quedan archivadas cuando el trabajo se cierra', () => {
      const cerrado = crearTrabajoEnCurso({ etapa: 'FINALIZADO' });
      expect(aPropuesta(cerrado, ctx).isArchived).toBe(true);
      expect(aAnteproyecto(cerrado, ctx)!.isArchived).toBe(true);
      expect(aTrabajoDeGrado(cerrado, ctx)!.isArchived).toBe(true);
    });

    it('lleva la etapa y las fechas que calcula el backend', () => {
      const trabajo = aTrabajoDeGrado(crearTrabajoEnCurso(), ctx)!;
      expect(trabajo.stage).toBe('EN_CURSO');
      expect(trabajo.deadlines).toEqual({
        startDate: new Date(2026, 2, 20),
        maximumDeliveryDate: new Date(2026, 11, 20),
        minimumSustentationDate: new Date(2026, 5, 20),
        objectivesChangeDeadline: new Date(2026, 8, 20),
        extensionRequestDeadline: new Date(2026, 11, 5)
      });
    });

    it('los informes mensuales son sus avances (el más reciente primero) y sus revisiones, las evaluaciones', () => {
      const trabajo = aTrabajoDeGrado(crearTrabajoEnCursoCon({
        informesMensuales: [
          informeDePrueba(1, { observaciones: 'Primer mes', revisiones: [revisionDePrueba()] }),
          informeDePrueba(2)
        ]
      }), ctx)!;

      expect(trabajo.advances?.map(a => [a.id, a.title, a.status])).toEqual([
        ['2', 'Informe mensual 2', stateList.EN_REVISION],
        ['1', 'Informe mensual 1', stateList.EVALUADO]
      ]);
      const primero = trabajo.advances![1];
      expect(primero).toEqual(expect.objectContaining({
        comments: 'Primer mes', studentId: '10', uploadedBy: 'Eva Estudiante'
      }));
      expect(primero.documents[0]).toEqual(expect.objectContaining({ name: 'informe-1', type: DocumentType.AVANCE }));
      expect(trabajo.evaluations).toEqual([expect.objectContaining({
        advanceId: '1', evaluatorId: '1', evaluatorName: 'Dora Directora Pérez', evaluatorRole: UserRoleType.DIRECTOR,
        veredict: stateList.EVALUADO, observations: 'Ajustar el cronograma',
        signedDocuments: [expect.objectContaining({ name: 'notas' })]
      })]);
    });

    it('las solicitudes del director son sus solicitudes especiales, con la decisión del Consejo', () => {
      const decision = { organo: 'CONSEJO_FACULTAD' as const, resultado: 'APROBADO' as const, acta: null,
        rutaArchivo: '15/RESOLUCION/v2/resolucion.pdf', observaciones: 'Procede', fecha: '2026-05-10' };
      const trabajo = aTrabajoDeGrado(crearTrabajoEnCursoCon({
        cambiosObjetivos: [{ tituloAnterior: 'Sistema de gestión', objetivosAnteriores: ['G'], tituloPropuesto: 'Nuevo',
          objetivosPropuestos: ['G2', 'E2'], justificacion: 'Cambio de alcance', fechaSolicitud: '2026-05-01', decision }],
        prorroga: { meses: 2, rutaSolicitud: '15/SOLICITUD_PRORROGA/v1/prorroga.pdf', fechaSolicitud: '2026-11-01',
          decision: null },
        suspensiones: [{ rutaSolicitud: '15/SOLICITUD_SUSPENSION/v1/s.pdf', fechaSolicitud: '2026-06-01',
          decision: { ...decision, fecha: '2026-06-05' }, fechaInicio: '2026-06-05', etapaPrevia: 'EN_CURSO',
          diasRestantes: 100, fechaMaximaReanudacion: '2026-12-05', fechaReanudacion: '2026-07-01',
          rutaReanudacion: '15/REANUDACION/v1/r.pdf', reanudacionAutomatica: false }]
      }), ctx)!;

      expect(trabajo.specialRequests.map(s => [s.id, s.requestType, s.status])).toEqual([
        ['prorroga-0', SpecialRequestType.PRORROGA, stateList.EN_REVISION],
        ['reanudacion-0', SpecialRequestType.REANUDACION, stateList.APROBADO],
        ['suspension-0', SpecialRequestType.SUSPENSION, stateList.APROBADO],
        ['cambio-objetivos-0', SpecialRequestType.CAMBIO_TITULO, stateList.APROBADO]
      ]);
      const [prorroga, , suspension, cambio] = trabajo.specialRequests;
      expect(prorroga).toEqual(expect.objectContaining({ months: 2, description: 'Prórroga de 2 meses' }));
      expect(prorroga.documents?.[0].name).toBe('prorroga');
      expect(suspension.grantedDeadline).toEqual(new Date(2026, 11, 5));
      expect(cambio).toEqual(expect.objectContaining({
        description: 'Cambio de alcance', proposedTitle: 'Nuevo', proposedObjectives: ['G2', 'E2'],
        resolutionDetails: 'Procede', resolutionDate: new Date(2026, 4, 10)
      }));
      expect(cambio.resolution?.name).toBe('resolucion');
    });

    it('la sustentación: solicitud con monografía, formato E, paz y salvo y anexos; sesión con coordinador', () => {
      const trabajo = aTrabajoDeGrado(crearTrabajoEnSustentacion(), ctx)!;

      expect(trabajo.sustentation).toEqual({
        state: 'PROGRAMADA', requestDate: new Date(2026, 6, 1), adjustmentsDeadline: null, secondSessionDeadline: null,
        coordinatorId: '30', jurorIds: ['30', '31'], currentSessionDate: new Date(2026, 6, 15, 9, 30),
        hasPendingNewDate: false
      });
      const entrega = trabajo.finalDeliveries![0];
      expect(entrega.status).toBe(stateList.EN_REVISION);
      expect([entrega.monograph.name, entrega.formatE.name, entrega.pazYSalvo?.name, entrega.annexes?.name])
        .toEqual(['monografia', 'formato-e', 'paz-y-salvo', 'anexos']);
      expect(entrega.monograph.type).toBe(DocumentType.MONOGRAFIA);
      expect(trabajo.pazYSalvos?.[0].document.name).toBe('paz-y-salvo');
      expect(trabajo.sustentations?.[0]).toEqual(expect.objectContaining({
        number: 1, status: SustentationStatus.PROGRAMADA, sustentationTime: '09:30', location: 'Sala 1',
        coordinatorId: '30'
      }));
      expect(trabajo.sustentations?.[0].formatEDocument?.name).toBe('formato-e-consejo');
      expect(trabajo.sustentations?.[0].assignedJurors.map(j => j.id)).toEqual(['30', '31']);
    });

    it('las sesiones van de la más reciente a la más antigua; la inasistencia y el acta se ven en su sesión', () => {
      const base = sustentacionDePrueba();
      const segunda = { ...base.sesiones[0], numero: 2, fechaHora: '2026-08-20T10:00:00', salon: 'Sala 2' };
      const trabajo = aTrabajoDeGrado(crearTrabajoEnSustentacion({
        estado: 'PROGRAMADA',
        sesiones: [base.sesiones[0], segunda],
        calificaciones: [{ sesion: 1, juradoUsuarioId: 30, jurado: 'Juan Coordinador', calificacion: 'APLAZADO',
          observaciones: 'Repetir', rutaActa: '15/TI-G/v1/acta.pdf', fecha: '2026-07-15' }],
        inasistencias: []
      }), ctx)!;

      expect(trabajo.sustentations?.map(s => [s.id, s.status])).toEqual([
        ['sesion-2', SustentationStatus.PROGRAMADA], ['sesion-1', SustentationStatus.APLAZADA]
      ]);
      expect(trabajo.sustentations?.[1].verdicts[0]).toEqual(expect.objectContaining({
        jurorId: '30', veredict: stateList.APLAZADO
      }));
      expect(trabajo.sustentations?.[1].verdicts[0].attachedDocument?.name).toBe('acta');
    });

    it('los ajustes con anexos y la verificación del coordinador', () => {
      const trabajo = aTrabajoDeGrado(crearTrabajoEnSustentacion({
        estado: 'APROBADA', rutaAjustes: '15/AJUSTES_SUSTENTACION/v1/ajustes.pdf',
        rutaAnexosAjustes: '15/ANEXOS/v2/anexos-ajustes.pdf', fechaAjustes: '2026-07-20',
        verificaciones: [{ sesion: 1, juradoUsuarioId: 30, jurado: 'Juan Coordinador', favorable: true,
          observaciones: null, fecha: '2026-07-21' }]
      }), ctx)!;

      const ajustes = trabajo.correctedDeliveries![0];
      expect(ajustes.status).toBe(stateList.APROBADO);
      expect(ajustes.annexes?.name).toBe('anexos-ajustes');
      expect(ajustes.verification).toEqual(expect.objectContaining({ favorable: true, jurorName: 'Juan Coordinador' }));
    });

    it('la solicitud de nueva fecha es una solicitud especial del director', () => {
      const trabajo = aTrabajoDeGrado(crearTrabajoEnSustentacion({
        solicitudesNuevaFecha: [{ sesion: 1, rutaSolicitud: '15/SOLICITUD_NUEVA_FECHA/v1/nueva-fecha.pdf',
          fechaSolicitud: '2026-07-10', fechaHoraAnterior: '2026-07-15T09:30:00', decision: null,
          nuevaFechaHora: null, nuevoSalon: null }]
      }), ctx)!;

      expect(trabajo.sustentation?.hasPendingNewDate).toBe(true);
      expect(trabajo.specialRequests[0]).toEqual(expect.objectContaining({
        id: 'nueva-fecha-0', requestType: SpecialRequestType.NUEVA_SUSTENTACION, status: stateList.EN_REVISION,
        description: 'Nueva fecha para la sesión 1 de sustentación (programada para el 15/07/2026 09:30)'
      }));
      expect(trabajo.specialRequests[0].documents?.[0].name).toBe('nueva-fecha');
    });

    it('la versión definitiva es un documento de cierre (formato H)', () => {
      const trabajo = aTrabajoDeGrado(crearTrabajoEnSustentacion({
        estado: 'FINALIZADA', rutaVersionDefinitiva: '15/TI-H/v1/definitiva.pdf', fechaVersionDefinitiva: '2026-07-25'
      }, { etapa: 'FINALIZADO' }), ctx)!;
      expect(trabajo.documents.map(d => [d.name, d.type])).toEqual([['definitiva', DocumentType.FORMATO_H]]);
    });
  });

  describe('estados', () => {
    it.each([
      ['EN_CURSO', stateList.EN_DESARROLLO], ['PRORROGA', stateList.EN_DESARROLLO],
      ['SUSTENTACION', stateList.EN_DESARROLLO], ['SUSPENDIDO', stateList.SUSPENDIDO],
      ['APLAZADO', stateList.APLAZADO], ['FINALIZADO', stateList.APROBADO],
      ['NO_APROBADO', stateList.NO_APROBADO], ['CANCELADO', stateList.CANCELADO]
    ] as const)('etapa %s → %s', (etapa, esperado) => {
      expect(estadoTrabajo(etapa)).toBe(esperado);
    });

    it('el anteproyecto aprobado por evaluadores queda "Evaluado" hasta que decide el Consejo', () => {
      expect(estadoAnteproyecto(crearTrabajoEnAnteproyecto({ etapa: 'APROBACION_CONSEJO' }))).toBe(stateList.EVALUADO);
    });

    it('aprobado por los evaluadores queda "Evaluado" mientras el Jefe no lo remite; la remisión queda en revisión', () => {
      const base = crearTrabajoEnCurso();
      const aprobado = crearTrabajoEnCurso({ etapa: 'EVALUACION', ejecucion: null,
        anteproyecto: { ...base.anteproyecto, decisionesConsejo: [], remisiones: [] } });
      expect(estadoAnteproyecto(aprobado)).toBe(stateList.EVALUADO);

      const remitido = crearTrabajoEnCurso({ etapa: 'APROBACION_CONSEJO', ejecucion: null,
        anteproyecto: { ...base.anteproyecto, decisionesConsejo: [] } });
      expect(aAnteproyecto(remitido, ctx)?.documents.find(d => d.type === DocumentType.FORMATO_C)?.status)
        .toBe(stateList.EN_REVISION);
    });

    it('el concepto incluye el documento de anotaciones del evaluador', () => {
      const base = crearTrabajoEnCurso();
      const conAnotaciones = crearTrabajoEnCurso({
        anteproyecto: { ...base.anteproyecto, conceptos: [{ ...base.anteproyecto.conceptos[0],
          anotaciones: { tipo: 'ANOTACIONES_EVALUACION', formato: null, ruta: '15/ANOTACIONES_EVALUACION/v1/notas.pdf',
            version: 1, fechaCarga: '2026-03-12' } }] }
      });
      expect(aAnteproyecto(conAnotaciones, ctx)?.evaluations[0].signedDocuments?.map(d => d.name))
        .toEqual(['formato-b', 'notas']);
    });

    it('el estado del anteproyecto es el de su última versión', () => {
      const base = crearTrabajoEnAnteproyecto();
      const version = { tipo: 'ANTEPROYECTO', formato: null, ruta: '15/ANTEPROYECTO/v1/a.pdf', version: 1,
        fechaCarga: '2026-03-10' };
      const conCorrecciones = crearTrabajoEnAnteproyecto({
        anteproyecto: { ...base.anteproyecto, versiones: [{ ...version, estado: 'CON_CORRECCIONES' }] }
      });
      expect(estadoAnteproyecto(conCorrecciones)).toBe(stateList.APROBADO_CON_OBSERVACIONES);

      const enRevision = crearTrabajoEnAnteproyecto({
        anteproyecto: { ...base.anteproyecto, versiones: [
          { ...version, estado: 'CON_CORRECCIONES' },
          { ...version, ruta: '15/ANTEPROYECTO/v2/a.pdf', version: 2, estado: 'EN_REVISION' }
        ] }
      });
      expect(estadoAnteproyecto(enRevision)).toBe(stateList.EN_REVISION);
      expect(aAnteproyecto(enRevision, ctx)?.documents.map(documento => documento.status))
        .toEqual([stateList.APROBADO_CON_OBSERVACIONES, stateList.EN_REVISION]);
    });

    it('veredictos', () => {
      expect(veredicto('APROBADO')).toBe(stateList.APROBADO);
      expect(veredicto('CON_CORRECCIONES')).toBe(stateList.APROBADO_CON_OBSERVACIONES);
      expect(veredicto('APROBADO_CON_OBSERVACIONES')).toBe(stateList.APROBADO_CON_OBSERVACIONES);
      expect(veredicto('APLAZADO')).toBe(stateList.APLAZADO);
      expect(veredicto('RECHAZADO')).toBe(stateList.NO_APROBADO);
      expect(veredicto('NO_APROBADO')).toBe(stateList.NO_APROBADO);
    });
  });

  describe('apoyo', () => {
    it('las fechas sin hora se toman en hora local (no se corren un día)', () => {
      expect(aFecha('2026-03-02')).toEqual(new Date(2026, 2, 2));
      expect(aFecha('2026-03-02T10:30:00')).toEqual(new Date('2026-03-02T10:30:00'));
      expect(aFecha(null)).toBeNull();
      expect(aFecha('no-es-fecha')).toBeNull();
    });

    it('nombre del archivo y tipo de documento', () => {
      expect(nombreDeRuta('15/TI-A/v2/propuesta final.pdf')).toBe('propuesta final');
      expect(tipoDocumento('DOCUMENTO_FINAL')).toBe(DocumentType.FORMATO_E);
      expect(tipoDocumento('SOLICITUD_PRORROGA')).toBe(DocumentType.FORMATO);
    });

    it('un participante desconocido se arma con los datos del trabajo', () => {
      expect(aUsuario(99, 'Nombre Compuesto Apellido', 'n@u.edu.co', '1099', ctx)).toEqual(expect.objectContaining({
        id: '99', firstName: 'Nombre', lastName: 'Compuesto Apellido', email: 'n@u.edu.co', codeNumber: 1099
      }));
    });
  });
});
