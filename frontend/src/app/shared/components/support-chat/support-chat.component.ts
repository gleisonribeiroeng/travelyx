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
    <!-- Topbar icon button -->
    <button mat-icon-button class="chat-trigger" (click)="toggle()" [class.active]="isOpen()">
      <mat-icon>{{ isOpen() ? 'close' : 'chat' }}</mat-icon>
    </button>

    <!-- Chat dropdown panel -->
    @if (isOpen()) {
      <div class="chat-backdrop" (click)="toggle()"></div>
      <div class="chat-panel">
        <div class="chat-header">
          <mat-icon>support_agent</mat-icon>
          <span>Suporte Travelyx</span>
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
    :host { position: relative; display: inline-flex; align-items: center; }

    .chat-trigger {
      color: rgba(255, 255, 255, 0.45);
      transition: color 0.2s;
    }
    .chat-trigger:hover, .chat-trigger.active { color: #f97316; }

    .chat-backdrop {
      position: fixed; inset: 0; z-index: 999;
    }

    .chat-panel {
      position: absolute; top: 48px; right: -60px;
      width: 360px; height: 460px;
      background: var(--triply-surface-1, #fff);
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08);
      display: flex; flex-direction: column;
      overflow: hidden;
      z-index: 1000;
      animation: chatSlideDown 0.2s ease;
    }

    @keyframes chatSlideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .chat-header {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 8px 14px 16px;
      background: #0f172a; color: white;
      font-weight: 700; font-size: 0.9rem;
      font-family: var(--triply-font-display, 'Sora', sans-serif);
    }
    .chat-header mat-icon:first-child { color: #f97316; }
    .chat-header span { flex: 1; }
    .chat-header button { color: rgba(255,255,255,0.5); }

    .chat-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 8px;
      background: var(--triply-surface-0, #f8fafc);
    }

    .loading-messages {
      display: flex; justify-content: center; padding: 16px;
    }

    .chat-bubble {
      max-width: 80%; padding: 10px 14px; border-radius: 14px;
      font-size: 0.85rem; line-height: 1.5;
    }
    .chat-bubble p { margin: 0; }
    .chat-bubble.system {
      align-self: flex-start;
      background: #fff;
      color: var(--triply-text-primary, #0f172a);
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .chat-bubble.user {
      align-self: flex-end;
      background: #f97316;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .msg-time {
      display: block; font-size: 0.6rem; margin-top: 4px;
      opacity: 0.5; text-align: right;
    }

    .chat-input {
      display: flex; align-items: center; gap: 4px;
      padding: 10px 8px 10px 16px;
      border-top: 1px solid var(--triply-border, #e2e8f0);
      background: #fff;
    }
    .chat-input input {
      flex: 1; border: none; outline: none; font-size: 0.85rem;
      background: transparent; color: var(--triply-text-primary, #0f172a);
      font-family: inherit;
    }
    .chat-input input::placeholder { color: var(--triply-text-tertiary, #94a3b8); }
    .chat-input button { color: #f97316; }

    @media (max-width: 599px) {
      .chat-panel {
        position: fixed; top: 56px; left: 8px; right: 8px;
        width: auto; height: calc(100vh - 120px);
        border-radius: 12px;
      }
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

    const token = this.auth.getToken();
    this.socket = io(`${baseUrl}/support`, {
      auth: { token },
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
