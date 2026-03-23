import { Component, Input, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ActivityService } from '../../../core/services/activity.service';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { TripActivity } from '../../../core/models/collaboration.models';

@Component({
  selector: 'app-activity-panel',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  template: `
    <div class="activity-panel">
      <!-- Filter chips -->
      <div class="filter-chips">
        <mat-chip-listbox (change)="filterUser = $event.value || ''">
          <mat-chip-option value="">{{ 'checklist.filterAll' | translate }}</mat-chip-option>
          @for (collab of collabService.collaborators(); track collab.id) {
            <mat-chip-option [value]="collab.userId">
              <div class="chip-avatar" matChipAvatar>
                @if (collab.picture) {
                  <img [src]="collab.picture" [alt]="collab.name" />
                } @else {
                  <span>{{ collab.name?.charAt(0)?.toUpperCase() }}</span>
                }
              </div>
              {{ (collab.name?.split(' ') ?? [])[0] }}
            </mat-chip-option>
          }
        </mat-chip-listbox>
      </div>

      <!-- Timeline -->
      <div class="timeline-container">
        @for (activity of filteredActivities(); track activity.id) {
          <div class="timeline-entry">
            <div class="timeline-line"></div>
            <div class="timeline-dot" [ngClass]="'dot-' + getActionType(activity.action)">
              <mat-icon>{{ getActionIcon(activity.action) }}</mat-icon>
            </div>
            <div class="timeline-content">
              <div class="entry-header">
                <div class="entry-avatar">
                  @if (activity.userPicture) {
                    <img [src]="activity.userPicture" [alt]="activity.userName" />
                  } @else {
                    <span class="avatar-initial">{{ activity.userName?.charAt(0)?.toUpperCase() }}</span>
                  }
                </div>
                <div class="entry-text">
                  <span class="user-name">{{ (activity.userName?.split(' ') ?? [])[0] }}</span>
                  <span class="action-text">{{ getActionLabel(activity) }}</span>
                </div>
              </div>
              <span class="entry-time">{{ timeAgo(activity.createdAt) }}</span>
            </div>
          </div>
        } @empty {
          <div class="empty-timeline">
            <mat-icon>history</mat-icon>
            <p>{{ 'collab.activity' | translate }} - {{ 'collab.activityEmpty' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .activity-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .filter-chips {
      overflow-x: auto;
      padding-bottom: 4px;

      .chip-avatar {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #6C5CE7, #a29bfe);
        flex-shrink: 0;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        span {
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
        }
      }
    }

    .timeline-container {
      display: flex;
      flex-direction: column;
      max-height: 480px;
      overflow-y: auto;
      padding-left: 4px;
    }

    .timeline-entry {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      position: relative;
      padding-bottom: 20px;
      padding-left: 8px;
    }

    .timeline-line {
      position: absolute;
      left: 19px;
      top: 28px;
      bottom: 0;
      width: 2px;
      background: var(--triply-border-subtle, #e8e8e8);
    }

    .timeline-entry:last-child .timeline-line {
      display: none;
    }

    .timeline-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      z-index: 1;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #fff;
      }

      &.dot-add { background: #4CAF50; }
      &.dot-edit { background: #FF9800; }
      &.dot-delete { background: #f44336; }
      &.dot-join { background: var(--triply-primary, #6C5CE7); }
      &.dot-comment { background: #2196F3; }
      &.dot-vote { background: #9C27B0; }
      &.dot-default { background: #9e9e9e; }
    }

    .timeline-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .entry-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .entry-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6C5CE7, #a29bfe);
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-initial {
        color: #fff;
        font-size: 0.65rem;
        font-weight: 700;
      }
    }

    .entry-text {
      font-size: 0.85rem;
      color: var(--triply-text-primary, #1a1a2e);
      line-height: 1.4;

      .user-name {
        font-weight: 600;
        margin-right: 4px;
      }

      .action-text {
        color: var(--triply-text-secondary, #666);
      }
    }

    .entry-time {
      font-size: 0.72rem;
      color: var(--triply-text-tertiary, #999);
      padding-left: 32px;
    }

    .empty-timeline {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 0;
      color: var(--triply-text-tertiary, #999);

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        opacity: 0.4;
      }

      p {
        font-size: 0.88rem;
        margin: 0;
      }
    }
  `],
})
export class ActivityPanelComponent implements OnInit {
  @Input() tripId!: string;

  private readonly activityService = inject(ActivityService);
  private readonly i18n = inject(TranslationService);
  readonly collabService = inject(CollaborationService);

  filterUser = '';

  readonly filteredActivities = computed(() => {
    const all = this.activityService.activities();
    if (!this.filterUser) return all;
    return all.filter((a) => a.userId === this.filterUser);
  });

  ngOnInit(): void {
    if (this.tripId) {
      this.activityService.loadActivities(this.tripId, { limit: 50 });
    }
  }

  getActionIcon(action: string): string {
    const map: Record<string, string> = {
      added: 'add_circle',
      updated: 'edit',
      removed: 'delete',
      joined: 'person_add',
      commented: 'comment',
      voted: 'poll',
    };
    return map[action] || 'info';
  }

  getActionType(action: string): string {
    const map: Record<string, string> = {
      added: 'add',
      updated: 'edit',
      removed: 'delete',
      joined: 'join',
      commented: 'comment',
      voted: 'vote',
    };
    return map[action] || 'default';
  }

  getActionLabel(activity: TripActivity): string {
    const actionMap: Record<string, string> = {
      added: this.i18n.t('collab.actionAdded'),
      updated: this.i18n.t('collab.actionUpdated'),
      removed: this.i18n.t('collab.actionRemoved'),
      joined: this.i18n.t('collab.actionJoined'),
      commented: this.i18n.t('collab.actionCommented'),
      voted: this.i18n.t('collab.actionVoted'),
    };
    const actionText = actionMap[activity.action] || activity.action;
    const target = activity.metadata?.label || activity.metadata?.targetName || '';
    return target ? `${actionText} ${target}` : actionText;
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
