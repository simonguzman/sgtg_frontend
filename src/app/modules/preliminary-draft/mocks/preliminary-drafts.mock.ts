import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { stateList } from '../../../core/enums/state.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { User } from '../../users/interfaces/user.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

// Helper local para construir usuarios parciales de prueba
// con todos los campos requeridos por la interfaz User.
const mockUser = (id: string, firstName: string, lastName: string, email?: string): User => ({
  id,
  idType: IdentificationType.CC,
  idNumber: 0,
  firstName,
  secondName: '',
  lastName,
  secondLastName: '',
  codeNumber: 0,
  roles: [],
  email: email ?? `${id}@mock.unicauca.edu.co`,
  password: 'mock',
  state: UserState.active
});

export const PRELIMINARY_DRAFTS_LIST: PreliminaryDraft[] = [
  {
    preliminaryDraftId: 'PD-1001',
    proposalId: 'PROP-1001',
    isArchived: false,
    state: stateList.EN_REVISION,
    createdData: new Date(),
    evaluationDeadline: new Date(new Date().setDate(new Date().getDate() + 7)),
    maximumDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 15)),
    evaluators: [],
    evaluations: [],
    documents: [
      {
        id: 'doc-1',
        name: 'Documento_Anteproyecto_v1',
        url: '#',
        uploadDate: new Date(),
        type: DocumentType.ANTEPROYECTO,
        status: stateList.EN_REVISION
      }
    ],
    proposalData: {
      id: 'PROP-1001',
      title: 'Sistema de Gestión de Usuarios con Arquitectura Frontend en Angular',
      description: 'Implementación del epic HE-01 bajo metodología Scrumban.',
      modality: Modality.TI,
      authors: [mockUser('user-simon-1', 'Simon', 'Guzmán Anaya', 'simon@test.com')],
      director: mockUser('dir-1', 'Carlos', 'Ramirez'),
      state: stateList.APROBADO,
      createdAt: new Date(),
      documents: [],
      evaluations: [],
      isArchived: false
    }
  },
  {
    preliminaryDraftId: 'PD-1002',
    proposalId: 'PROP-1002',
    isArchived: false,
    state: stateList.EN_REVISION,
    createdData: new Date(),
    evaluationDeadline: new Date(),
    maximumDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    evaluators: [mockUser('user-simon-1', 'Simon', 'Guzmán Anaya')],
    evaluations: [],
    documents: [],
    proposalData: {
      id: 'PROP-1002',
      title: 'Optimización de Renderizado con Signals',
      description: 'Estudio de rendimiento en tablas de datos grandes usando la nueva API de Angular.',
      modality: Modality.TI,
      authors: [mockUser('student-2', 'Ana', 'Lopez')],
      director: mockUser('dir-2', 'Luis', 'Martinez'),
      state: stateList.APROBADO,
      createdAt: new Date(),
      documents: [],
      evaluations: [],
      isArchived: false
    }
  },
  {
    preliminaryDraftId: 'PD-1003',
    proposalId: 'PROP-1003',
    isArchived: true,
    state: stateList.APROBADO,
    createdData: new Date('2025-08-10'),
    evaluationDeadline: new Date('2025-08-20'),
    maximumDeliveryDate: new Date('2025-09-01'),
    evaluators: [],
    evaluations: [],
    documents: [],
    proposalData: {
      id: 'PROP-1003',
      title: 'Migración de Sistema Legacy a Arquitectura Serverless',
      description: 'Propuesta archivada de semestres anteriores.',
      modality: Modality.PP,
      authors: [mockUser('user-simon-1', 'Simon', 'Guzmán Anaya')],
      director: mockUser('dir-3', 'Marta', 'Gomez'),
      state: stateList.APROBADO,
      createdAt: new Date('2025-07-01'),
      documents: [],
      evaluations: [],
      isArchived: true
    }
  }
];
