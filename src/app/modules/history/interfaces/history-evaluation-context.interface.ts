import { User } from "../../users/interfaces/user.interface";

// ← Simplificado: ya no carga Injector ni servicios opcionales. Antes,
// dos de los tres tabs usaban runInInjectionContext(context.injector, ...)
// para inyectar servicios que ni siquiera vivían en esta interfaz, mientras
// que el tercero los recibía como propiedades — dos soluciones distintas
// al mismo problema. Convertir los tabs en servicios inyectables (abajo)
// elimina la necesidad de pasar servicios por aquí: cada tab resuelve sus
// propias dependencias por DI normal.
export interface HistoryEvaluationContext {
  currentUser: User | null;
  hasGlobalAccess: boolean;
}
