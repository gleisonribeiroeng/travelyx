import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TripInvite } from '../../../core/models/collaboration.models';

@Component({
  selector: 'app-pending-invites',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  template: `
    @if (collabService.pendingInvites().length > 0) {
      <div class="pending-invites">
        <div class="invites-header">
          <mat-icon>mail</mat-icon>
          <span>{{ 'collab.pendingInvites' | translate }}</span>
        </div>
        @for (invite of collabService.pendingInvites(); track invite.id) {
          <div class="invite-card" [class.dismissing]="dismissing().has(invite.id)">
            <div class="invite-left">
              <div class="invite-avatar">
                @if (invite.invitedBy.picture) {
                  <img [src]="invite.invitedBy.picture" [alt]="invite.invitedBy.name" />
                } @else {
                  <mat-icon>person</mat-icon>
                }
              </div>
              <div class="invite-info">
                <span class="invite-trip">{{ invite.tripName }}</span>
                <span class="invite-by">{{ 'collab.invitedBy' | translate }} {{ invite.invitedBy.name }}</span>
              </div>
            </div>
            <div class="invite-actions">
              <button mat-flat-button color="primary" class="accept-btn"
                      [disabled]="processing().has(invite.id)"
                      (click)="accept(invite)">
                @if (processing().has(invite.id)) {
                  <mat-spinner diameter="16"></mat-spinner>
                } @else {
                  {{ 'collab.acceptInvite' | translate }}
                }
              </button>
              <button mat-stroked-button class="reject-btn"
                      [disabled]="processing().has(invite.id)"
                      (click)="reject(invite)">
                {{ 'collab.rejectInvite' | translate }}
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .pending-invites {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .invites-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--triply-text-primary, #1a1a2e);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--triply-primary, #f97316);
      }
    }

    .invite-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.06) 0%, rgba(249, 115, 22, 0.04) 100%);
      border: 1px solid rgba(249, 115, 22, 0.15);
      border-radius: var(--triply-radius-lg, 16px);
      transition: all 0.35s ease;
      opacity: 1;
      transform: translateX(0);
      overflow: hidden;

      &.dismissing {
        opacity: 0;
        transform: translateX(40px);
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: -10px;
        border-width: 0;
      }
    }

    .invite-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .invite-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f97316, #fb923c);
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      mat-icon {
        color: #fff;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .invite-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .invite-trip {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--triply-text-primary, #1a1a2e);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .invite-by {
      font-size: 0.78rem;
      color: var(--triply-text-secondary, #666);
    }

    .invite-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .accept-btn {
      font-size: 0.82rem !important;
      font-weight: 600 !important;
      min-width: 80px;
      height: 36px !important;
    }

    .reject-btn {
      font-size: 0.82rem !important;
      font-weight: 500 !important;
      color: var(--triply-text-secondary, #666) !important;
      border-color: var(--triply-border-subtle, #ddd) !important;
      height: 36px !important;
    }

    @media (max-width: 599px) {
      .invite-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .invite-actions {
        align-self: flex-end;
      }
    }
  `],
})
export class PendingInvitesComponent {
  readonly collabService = inject(CollaborationService);
  private readonly notify = inject(NotificationService);
  private readonly i18n = inject(TranslationService);

  readonly processing = signal(new Set<string>());
  readonly dismissing = signal(new Set<string>());

  accept(invite: TripInvite): void {
    this.processing.update(s => { const n = new Set(s); n.add(invite.id); return n; });

    this.collabService.acceptInvite(invite.token).subscribe({
      next: () => {
        this.notify.success(this.i18n.t('collab.inviteAccepted'));
        this.dismiss(invite.id);
      },
      error: () => {
        this.processing.update(s => { const n = new Set(s); n.delete(invite.id); return n; });
      },
    });
  }

  reject(invite: TripInvite): void {
    this.processing.update(s => { const n = new Set(s); n.add(invite.id); return n; });

    this.collabService.rejectInvite(invite.token).subscribe({
      next: () => {
        this.notify.success(this.i18n.t('collab.inviteRejected'));
        this.dismiss(invite.id);
      },
      error: () => {
        this.processing.update(s => { const n = new Set(s); n.delete(invite.id); return n; });
      },
    });
  }

  private dismiss(id: string): void {
    this.dismissing.update(s => { const n = new Set(s); n.add(id); return n; });
    // Let the animation play, then the service already removed from list
    setTimeout(() => {
      this.dismissing.update(s => { const n = new Set(s); n.delete(id); return n; });
      this.processing.update(s => { const n = new Set(s); n.delete(id); return n; });
    }, 400);
  }
}
