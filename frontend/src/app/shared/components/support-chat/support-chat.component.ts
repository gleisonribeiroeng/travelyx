import { Component, signal, inject, ElementRef, viewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { SupportApiService } from '../../../core/api/support-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id?: string;
  text: string;
  fromUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-support-chat',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule],
  template: `
    <!-- FAB button -->
    <button class="chat-fab" (click)="toggle()" [class.open]="isOpen()">
      <mat-icon>{{ isOpen() ? 'close' : 'chat' }}</mat-icon>
    </button>

    <!-- Chat panel -->
    @if (isOpen()) {
      <div class="chat-panel">
        <div class="chat-header">
          <mat-icon>support_agent</mat-icon>
          <span>Suporte Triply</span>
          <button mat-icon-button (click)="toggle()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="chat-messages" #messagesContainer>
          @if (isLoading()) {
            <div class="loading-messages">
              <mat-spinner diameter="24"></mat-spinner>
            </div>
          }
          @for (msg of messages(); track msg.id ?? $index) {
            <div class="chat-bubble" [class.user]="msg.fromUser" [class.system]="!msg.fromUser">
              <p>{{ msg.text }}</p>
              <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          }
        </div>

        <div class="chat-input">
          <input
            type="text"
            [(ngModel)]="messageText"
            placeholder="Digite sua mensagem..."
            (keydown.enter)="send()"
            [disabled]="isSending()"
          >
          <button mat-icon-button color="primary" (click)="send()" [disabled]="!messageText.trim() || isSending()">
            @if (isSending()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <mat-icon>send</mat-icon>
            }
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; bottom: 24px; right: 24px; z-index: 9998; }

    .chat-fab {
      width: 56px; height: 56px; border-radius: 50%; border: none;
      background: var(--triply-primary, #7c4dff); color: white;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(124, 77, 255, 0.4);
      transition: all 0.2s ease;
    }
    .chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(124, 77, 255, 0.5); }
    .chat-fab.open { background: var(--triply-text-secondary, #666); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

    .chat-panel {
      position: absolute; bottom: 72px; right: 0;
      width: 340px; height: 440px;
      background: var(--triply-surface-1, #fff);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .chat-header {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 8px 12px 16px;
      background: var(--triply-primary, #7c4dff); color: white;
      font-weight: 600; font-size: 0.95rem;
    }
    .chat-header span { flex: 1; }
    .chat-header button { color: white; }

    .chat-messages {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 8px;
    }

    .loading-messages {
      display: flex; justify-content: center; padding: 16px;
    }

    .chat-bubble {
      max-width: 80%; padding: 8px 12px; border-radius: 12px;
      font-size: 0.85rem; line-height: 1.4;
    }
    .chat-bubble p { margin: 0; }
    .chat-bubble.system {
      align-self: flex-start;
      background: var(--triply-surface-2, #f5f5f5);
      color: var(--triply-text-primary, #333);
      border-bottom-left-radius: 4px;
    }
    .chat-bubble.user {
      align-self: flex-end;
      background: var(--triply-primary, #7c4dff);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .msg-time {
      display: block; font-size: 0.65rem; margin-top: 4px;
      opacity: 0.6; text-align: right;
    }

    .chat-input {
      display: flex; align-items: center; gap: 4px;
      padding: 8px 8px 8px 16px;
      border-top: 1px solid var(--triply-border, #e0e0e0);
    }
    .chat-input input {
      flex: 1; border: none; outline: none; font-size: 0.85rem;
      background: transparent; color: var(--triply-text-primary, #333);
      font-family: inherit;
    }
    .chat-input input::placeholder { color: var(--triply-text-secondary, #999); }

    @media (max-width: 480px) {
      :host { bottom: 16px; right: 16px; left: 16px; }
      .chat-panel { width: auto; left: 0; right: 0; height: 60vh; }
    }
  `],
})
export class SupportChatComponent implements OnDestroy {
  private readonly supportApi = inject(SupportApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messagesContainer = viewChild<ElementRef>('messagesContainer');

  private socket: Socket | null = null;
  private historyLoaded = false;

  readonly isOpen = signal(false);
  readonly isSending = signal(false);
  readonly isLoading = signal(false);
  readonly messages = signal<ChatMessage[]>([
    { text: 'Olá! Como posso ajudar? Envie sua mensagem e responderemos em breve.', fromUser: false, timestamp: new Date() },
  ]);

  messageText = '';

  toggle(): void {
    const opening = !this.isOpen();
    this.isOpen.set(opening);

    if (opening) {
      this.connectSocket();
      if (!this.historyLoaded) {
        this.loadHistory();
      }
    }
  }

  send(): void {
    const text = this.messageText.trim();
    if (!text || this.isSending()) return;

    this.messageText = '';
    this.isSending.set(true);
    const currentPage = this.router.url;

    this.supportApi.sendMessage(text, currentPage).subscribe({
      next: (res) => {
        if (res.message) {
          this.messages.update(msgs => [...msgs, {
            id: res.message.id,
            text: res.message.content,
            fromUser: true,
            timestamp: new Date(res.message.createdAt),
          }]);
        } else {
          this.messages.update(msgs => [...msgs, { text, fromUser: true, timestamp: new Date() }]);
        }
        this.isSending.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.messages.update(msgs => [
          ...msgs,
          { text: 'Erro ao enviar mensagem. Tente novamente.', fromUser: false, timestamp: new Date() },
        ]);
        this.isSending.set(false);
        this.scrollToBottom();
      },
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    this.disconnectSocket();
  }

  private connectSocket(): void {
    if (this.socket?.connected) return;

    const user = this.auth.user();
    if (!user) return;

    const baseUrl = environment.apiBaseUrl || window.location.origin;

    this.socket = io(`${baseUrl}/support`, {
      query: { userId: user.googleId },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('support:reply', (msg: any) => {
      this.messages.update(msgs => [...msgs, {
        id: msg.id,
        text: msg.content,
        fromUser: false,
        timestamp: new Date(msg.createdAt),
      }]);
      this.scrollToBottom();
    });
  }

  private disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private loadHistory(): void {
    this.isLoading.set(true);
    this.supportApi.getHistory().subscribe({
      next: (res) => {
        if (res.messages.length > 0) {
          const history: ChatMessage[] = res.messages.map((m: any) => ({
            id: m.id,
            text: m.content,
            fromUser: m.fromUser,
            timestamp: new Date(m.createdAt),
          }));
          // Replace welcome message with history
          this.messages.set([
            { text: 'Olá! Como posso ajudar?', fromUser: false, timestamp: new Date() },
            ...history,
          ]);
        }
        this.historyLoaded = true;
        this.isLoading.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
