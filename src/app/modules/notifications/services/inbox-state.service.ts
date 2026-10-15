import { DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { catchError, EMPTY, Observable, Subscription, switchMap, tap, timer } from 'rxjs';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificacionApiService } from '../../../core/services/notificaciones/notificacion-api.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificacionApi } from '../../../core/interfaces/api/notificacion-api.interface';
import { aMensajeDelBuzon } from '../helpers/inbox-message.mapper';

/** Cada cuánto se consulta el buzón mientras hay sesión. */
export const INTERVALO_BUZON_MS = 60_000;

/**
 * Buzón del usuario en sesión. Las notificaciones las genera el backend; aquí
 * se consultan al iniciar sesión y cada {@link INTERVALO_BUZON_MS}. Cuando
 * llegan notificaciones nuevas se avisa con un mensaje emergente y se recargan
 * los trabajos de grado, que alguien más acaba de cambiar.
 */
@Injectable({
  providedIn: 'root'
})
export class InboxStateService {
  private readonly api = inject(NotificacionApiService);
  private readonly authStorage = inject(AuthStorageService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly notificationService = inject(NotificationService);

  private readonly _messages = signal<InboxMessage[]>([]);
  public readonly messagesSignal = this._messages.asReadonly();

  private consulta?: Subscription;
  /** Ids recibidos en la última consulta; null antes de la primera. */
  private conocidas: Set<string> | null = null;

  constructor() {
    effect(() => {
      const autenticado = this.authStorage.isAuthenticated();
      untracked(() => autenticado ? this.iniciar() : this.detener());
    });
    inject(DestroyRef).onDestroy(() => this.detener());
  }

  /** Consulta el buzón ahora (además de la consulta periódica). */
  public refrescar(): Observable<NotificacionApi[]> {
    return this.api.listar().pipe(
      tap(notificaciones => this.recibir(notificaciones)),
      catchError(() => EMPTY)
    );
  }

  public markAsRead(id: string): void {
    const mensaje = this._messages().find(m => m.id === id);
    if (!mensaje || mensaje.status === 'leido') return;
    this.actualizar(messages => messages.map(m => m.id === id ? { ...m, status: 'leido' } : m));
    this.api.marcarLeida(id).subscribe({ error: () => this.refrescar().subscribe() });
  }

  public deleteMessage(id: string): void {
    this.actualizar(messages => messages.filter(m => m.id !== id));
    this.api.eliminar(id).subscribe({ error: () => this.refrescar().subscribe() });
  }

  public clearAllMessages(): void {
    this.actualizar(() => []);
    this.api.eliminarTodas().subscribe({ error: () => this.refrescar().subscribe() });
  }

  private iniciar(): void {
    this.detener();
    this.consulta = timer(0, INTERVALO_BUZON_MS)
      .pipe(switchMap(() => this.refrescar()))
      .subscribe();
  }

  private detener(): void {
    this.consulta?.unsubscribe();
    this.consulta = undefined;
    this.conocidas = null;
    this._messages.set([]);
  }

  private recibir(notificaciones: NotificacionApi[]): void {
    const userId = this.authStorage.currentUser()?.id ?? '';
    const mensajes = notificaciones.map(n => aMensajeDelBuzon(n, userId));
    const nuevas = this.conocidas === null ? []
      : mensajes.filter(m => !this.conocidas!.has(m.id) && m.status === 'no leido');
    this.conocidas = new Set(mensajes.map(m => m.id));
    this._messages.set(mensajes);

    if (nuevas.length === 0) return;
    const [primera] = nuevas;
    this.notificationService.show({
      type: primera.type,
      title: nuevas.length === 1 ? primera.title : `Tienes ${nuevas.length} notificaciones nuevas`,
      message: nuevas.length === 1 ? primera.message : primera.title,
      autoDismiss: true
    });
    this.store.cargar().subscribe();
  }

  private actualizar(cambio: (messages: InboxMessage[]) => InboxMessage[]): void {
    this._messages.update(cambio);
    this.conocidas = new Set(this._messages().map(m => m.id));
  }
}
