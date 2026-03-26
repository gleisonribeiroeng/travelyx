import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { PollsService } from '../../../core/services/polls.service';
import { AuthService } from '../../../core/services/auth.service';
import { TripPoll } from '../../../core/models/collaboration.models';

@Component({
  selector: 'app-poll-card',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  template: `
    <mat-card class="poll-card" [class.closed]="!!poll.closedAt">
      <!-- Question -->
      <div class="poll-question">
        <mat-icon class="poll-icon">poll</mat-icon>
        <h4>{{ poll.question }}</h4>
        @if (poll.closedAt) {
          <span class="closed-badge">{{ 'collab.pollClosed' | translate }}</span>
        }
      </div>

      <!-- Options -->
      <div class="poll-options">
        @for (option of poll.options; track option.id) {
          <button class="poll-option" [class.voted]="option.votedByMe"
                  [class.disabled]="!!poll.closedAt"
                  [disabled]="!!poll.closedAt"
                  (click)="onVote(option.id)">
            <div class="option-bar">
              <div class="option-fill" [style.width.%]="getPercentage(option.voteCount)"></div>
            </div>
            <div class="option-content">
              <span class="option-label">{{ option.label }}</span>
              <span class="option-count">{{ option.voteCount }}</span>
            </div>
            @if (option.votedByMe) {
              <mat-icon class="voted-check">check_circle</mat-icon>
            }
          </button>
        }
      </div>

      <!-- Footer -->
      <div class="poll-footer">
        <div class="poll-creator">
          <div class="creator-avatar">
            @if (poll.createdBy.picture) {
              <img [src]="poll.createdBy.picture" [alt]="poll.createdBy.name" />
            } @else {
              <span class="avatar-initial">{{ poll.createdBy.name?.charAt(0)?.toUpperCase() }}</span>
            }
          </div>
          <span class="creator-name">{{ poll.createdBy.name }}</span>
          <span class="poll-time">{{ timeAgo(poll.createdAt) }}</span>
        </div>
        @if (!poll.closedAt && isCreator()) {
          <button mat-stroked-button class="close-btn" (click)="onClose()">
            <mat-icon>lock</mat-icon>
            {{ 'collab.closePoll' | translate }}
          </button>
        }
      </div>
    </mat-card>
  `,
  styles: [`
    .poll-card {
      padding: 16px 20px;
      border-radius: var(--triply-radius-md, 12px);
      border: 1px solid var(--triply-border-subtle, #e8e8e8);
      transition: box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      }

      &.closed {
        opacity: 0.75;
      }
    }

    .poll-question {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;

      .poll-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--triply-primary, #f97316);
      }

      h4 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--triply-text-primary, #1a1a2e);
        flex: 1;
      }

      .closed-badge {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 3px 10px;
        border-radius: 20px;
        background: rgba(158, 158, 158, 0.12);
        color: #9e9e9e;
        flex-shrink: 0;
      }
    }

    .poll-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }

    .poll-option {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 44px;
      padding: 10px 14px;
      border: 2px solid var(--triply-border-subtle, #e0e0e0);
      border-radius: var(--triply-radius-sm, 8px);
      background: var(--triply-surface-1, #fff);
      cursor: pointer;
      overflow: hidden;
      transition: all 0.2s ease;
      font-family: inherit;
      text-align: left;

      &:hover:not(.disabled) {
        border-color: var(--triply-primary, #f97316);
      }

      &.voted {
        border-color: var(--triply-primary, #f97316);
        background: rgba(249, 115, 22, 0.04);

        .option-fill {
          background: rgba(249, 115, 22, 0.12);
        }
      }

      &.disabled {
        cursor: default;
      }
    }

    .option-bar {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .option-fill {
      height: 100%;
      background: rgba(249, 115, 22, 0.06);
      border-radius: var(--triply-radius-sm, 8px);
      transition: width 0.4s ease;
    }

    .option-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .option-label {
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--triply-text-primary, #1a1a2e);
    }

    .option-count {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--triply-text-secondary, #666);
      flex-shrink: 0;
    }

    .voted-check {
      position: relative;
      z-index: 1;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--triply-primary, #f97316);
      margin-left: 8px;
      flex-shrink: 0;
    }

    .poll-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .poll-creator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .creator-avatar {
      width: 20px;
      height: 20px;
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

      .avatar-initial {
        color: #fff;
        font-size: 0.55rem;
        font-weight: 700;
      }
    }

    .creator-name {
      font-size: 0.75rem;
      color: var(--triply-text-secondary, #666);
    }

    .poll-time {
      font-size: 0.72rem;
      color: var(--triply-text-tertiary, #999);
    }

    .close-btn {
      font-size: 0.78rem;
      font-weight: 600;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }
    }
  `],
})
export class PollCardComponent {
  @Input() poll!: TripPoll;
  @Input() tripId!: string;

  private readonly pollsService = inject(PollsService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(TranslationService);

  get totalVotes(): number {
    return this.poll.options.reduce((sum, o) => sum + o.voteCount, 0);
  }

  getPercentage(voteCount: number): number {
    const total = this.totalVotes;
    return total > 0 ? Math.round((voteCount / total) * 100) : 0;
  }

  isCreator(): boolean {
    const user = this.auth.user();
    return user?.name === this.poll.createdBy.name;
  }

  onVote(optionId: string): void {
    if (this.poll.closedAt) return;
    this.pollsService.vote(this.tripId, this.poll.id, optionId).subscribe();
  }

  onClose(): void {
    this.pollsService.closePoll(this.tripId, this.poll.id).subscribe();
  }

  timeAgo(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return this.i18n.t('collab.timeAgo.now');
    if (minutes < 60) return `${minutes}${this.i18n.t('collab.timeAgo.min')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${this.i18n.t('collab.timeAgo.hours')}`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}${this.i18n.t('collab.timeAgo.days')}`;
    const locale = this.i18n.lang() === 'en' ? 'en-US' : 'pt-BR';
    return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  }
}
