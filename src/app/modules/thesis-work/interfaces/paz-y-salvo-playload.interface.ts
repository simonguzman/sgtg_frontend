// features/thesis-work/interfaces/paz-y-salvo-payload.interface.ts

export interface PazYSalvoPayload {
  academicApproved: boolean;
  academicComments?: string; // Lo ideal es dejarlo opcional (?) por si se aprueba sin observaciones
  financialApproved: boolean;
  financialComments?: string; // Lo opcional también aplica para la parte financiera
}
