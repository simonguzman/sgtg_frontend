import { Injectable, signal, effect } from '@angular/core';
import { InboxMessage } from '../interfaces/inbox-message.interface';

// ← Reemplaza el `as any[]` del parseo — refleja la forma real en la que
// las fechas quedan serializadas en localStorage (como string, no Date).
interface StoredInboxMessage extends Omit<InboxMessage, 'date'> {
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class InboxStateService {
  private readonly STORAGE_KEY = 'academic_inbox_messages';

  private readonly _messages = signal<InboxMessage[]>(this.loadFromStorage());
  public readonly messagesSignal = this._messages.asReadonly();

  constructor() {
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
      const parsed = JSON.parse(stored) as StoredInboxMessage[];
      return parsed.map(message => ({
        ...message,
        date: new Date(message.date) // Reconstrucción crucial del objeto Date
      }));
    } catch (error) {
      console.error('Error parseando notificaciones de localStorage', error);
      // ← FIX: se agrega removeItem, igual que ProposalStorageService y
      // PreliminaryDraftStorageService. Sin esto, un JSON corrupto fallaría
      // el parseo en cada carga de la app indefinidamente, no solo una vez.
      localStorage.removeItem(this.STORAGE_KEY);
      return [];
    }
  }
}
