import { Injectable, signal, effect } from '@angular/core';
import { InboxMessage } from '../interfaces/inbox-message.interface';

@Injectable({
  providedIn: 'root'
})
export class InboxStateService {
  private readonly STORAGE_KEY = 'academic_inbox_messages';

  // Inicializa leyendo del almacenamiento local
  private readonly _messages = signal<InboxMessage[]>(this.loadFromStorage());

  // Exponemos una señal de solo lectura al exterior
  public readonly messagesSignal = this._messages.asReadonly();

  constructor() {
    // Sincronización automática ante cualquier cambio en el Signal interno
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._messages()));
    });
  }

  public addMessages(newMessages: InboxMessage[]): void {
    this._messages.update(previousMessage => [...newMessages, ...previousMessage]);
  }

  public markAsRead(id: string): void {
    this._messages.update(messages =>
      messages.map(message => message.id === id ? { ...message, status: 'leido' } : message)
    );
  }

  public deleteMessage(id: string): void {
    this._messages.update(messages => messages.filter(message => message.id !== id));
  }

  public clearAllMessages(userId: string): void {
    this._messages.update(messages => messages.filter(message => message.userId !== userId));
  }

  private loadFromStorage(): InboxMessage[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as any[];
      return parsed.map(message => ({
        ...message,
        date: new Date(message.date) // Reconstrucción crucial del objeto Date
      }));
    } catch (error) {
      console.error('Error parseando notificaciones de localStorage', error);
      return [];
    }
  }
}
