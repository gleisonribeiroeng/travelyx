import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CommentsService } from '../../../core/services/comments.service';
import { AuthService } from '../../../core/services/auth.service';
import { TripComment } from '../../../core/models/collaboration.models';

@Component({
  selector: 'app-comment-thread',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="comment-thread">
      <!-- Input -->
      <div class="comment-input-row">
        <div class="input-avatar">
          @if (auth.user()?.picture) {
            <img [src]="auth.user()!.picture" [alt]="auth.user()!.name" />
          } @else {
            <span class="avatar-initial">{{ auth.user()?.name?.charAt(0)?.toUpperCase() }}</span>
          }
        </div>
        <mat-form-field appearance="outline" class="comment-field">
          <input matInput [(ngModel)]="newComment" [placeholder]="'collab.addComment' | translate"
                 (keydown.enter)="submitComment()" />
        </mat-form-field>
        <button mat-icon-button color="primary" [disabled]="!newComment.trim() || sending()"
                (click)="submitComment()">
          <mat-icon>send</mat-icon>
        </button>
      </div>

      <!-- Comments list -->
      <div class="comments-list">
        @for (comment of commentsService.comments(); track comment.id) {
          <div class="comment-item">
            <div class="comment-avatar">
              @if (comment.userPicture) {
                <img [src]="comment.userPicture" [alt]="comment.userName" />
              } @else {
                <span class="avatar-initial">{{ comment.userName?.charAt(0)?.toUpperCase() }}</span>
              }
            </div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author">{{ comment.userName }}</span>
                <span class="comment-time">{{ timeAgo(comment.createdAt) }}</span>
              </div>
              <p class="comment-content">{{ comment.content }}</p>

              <!-- Reactions -->
              <div class="reaction-bar">
                @for (emoji of reactionEmojis; track emoji) {
                  <button class="reaction-btn" [class.reacted]="hasReacted(comment, emoji)"
                          (click)="toggleReaction(comment.id, emoji)">
                    <span class="emoji">{{ emoji }}</span>
                    @if (getReactionCount(comment, emoji) > 0) {
                      <span class="reaction-count">{{ getReactionCount(comment, emoji) }}</span>
                    }
                  </button>
                }
                <button class="reply-btn" (click)="replyingTo.set(replyingTo() === comment.id ? null : comment.id)">
                  <mat-icon>reply</mat-icon>
                </button>
              </div>

              <!-- Reply input -->
              @if (replyingTo() === comment.id) {
                <div class="reply-input-row">
                  <mat-form-field appearance="outline" class="reply-field">
                    <input matInput [(ngModel)]="replyText" [placeholder]="i18n.t('collab.replyPlaceholder')"
                           (keydown.enter)="submitReply(comment.id)" />
                  </mat-form-field>
                  <button mat-icon-button color="primary" [disabled]="!replyText.trim()"
                          (click)="submitReply(comment.id)">
                    <mat-icon>send</mat-icon>
                  </button>
                </div>
              }

              <!-- Replies -->
              @if (comment.replies?.length) {
                <div class="replies">
                  @for (reply of comment.replies; track reply.id) {
                    <div class="reply-item">
                      <div class="reply-avatar">
                        @if (reply.userPicture) {
                          <img [src]="reply.userPicture" [alt]="reply.userName" />
                        } @else {
                          <span class="avatar-initial">{{ reply.userName?.charAt(0)?.toUpperCase() }}</span>
                        }
                      </div>
                      <div class="reply-body">
                        <div class="comment-header">
                          <span class="comment-author">{{ reply.userName }}</span>
                          <span class="comment-time">{{ timeAgo(reply.createdAt) }}</span>
                        </div>
                        <p class="comment-content">{{ reply.content }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="empty-comments">
            <mat-icon>chat_bubble_outline</mat-icon>
            <p>{{ 'collab.noComments' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .comment-thread {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .comment-input-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .input-avatar, .comment-avatar, .reply-avatar {
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
        font-weight: 700;
      }
    }

    .input-avatar {
      width: 36px;
      height: 36px;

      .avatar-initial { font-size: 0.85rem; }
    }

    .comment-avatar {
      width: 32px;
      height: 32px;

      .avatar-initial { font-size: 0.75rem; }
    }

    .reply-avatar {
      width: 24px;
      height: 24px;

      .avatar-initial { font-size: 0.6rem; }
    }

    .comment-field {
      flex: 1;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 480px;
      overflow-y: auto;
    }

    .comment-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .comment-body {
      flex: 1;
      min-width: 0;
    }

    .comment-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .comment-author {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--triply-text-primary, #1a1a2e);
    }

    .comment-time {
      font-size: 0.72rem;
      color: var(--triply-text-tertiary, #999);
    }

    .comment-content {
      margin: 2px 0 6px;
      font-size: 0.88rem;
      color: var(--triply-text-primary, #333);
      line-height: 1.45;
    }

    .reaction-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .reaction-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid var(--triply-border-subtle, #e0e0e0);
      background: var(--triply-surface-1, #fff);
      cursor: pointer;
      font-size: 0.78rem;
      transition: all 0.15s ease;

      .emoji { font-size: 0.9rem; }
      .reaction-count {
        font-weight: 600;
        color: var(--triply-text-secondary, #666);
      }

      &:hover {
        background: rgba(249, 115, 22, 0.06);
        border-color: var(--triply-primary, #f97316);
      }

      &.reacted {
        background: rgba(249, 115, 22, 0.1);
        border-color: var(--triply-primary, #f97316);

        .reaction-count { color: var(--triply-primary, #f97316); }
      }
    }

    .reply-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--triply-text-tertiary, #999);
      }

      &:hover mat-icon { color: var(--triply-primary, #f97316); }
    }

    .reply-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .reply-field {
      flex: 1;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      ::ng-deep .mat-mdc-text-field-wrapper {
        padding: 0 8px;
      }
    }

    .replies {
      margin-top: 10px;
      padding-left: 8px;
      border-left: 2px solid var(--triply-border-subtle, #e8e8e8);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .reply-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .reply-body {
      flex: 1;
      min-width: 0;
    }

    .empty-comments {
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
export class CommentThreadComponent implements OnInit {
  @Input() tripId!: string;
  @Input() targetType!: string;
  @Input() targetId!: string;

  readonly commentsService = inject(CommentsService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);

  readonly reactionEmojis = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{2753}'];
  readonly sending = signal(false);
  readonly replyingTo = signal<string | null>(null);

  newComment = '';
  replyText = '';

  ngOnInit(): void {
    if (this.tripId) {
      this.commentsService.loadComments(this.tripId, this.targetType, this.targetId);
    }
  }

  submitComment(): void {
    const content = this.newComment.trim();
    if (!content) return;
    this.sending.set(true);
    this.commentsService
      .addComment(this.tripId, this.targetType, this.targetId, content)
      .subscribe({
        next: () => {
          this.newComment = '';
          this.sending.set(false);
        },
        error: () => this.sending.set(false),
      });
  }

  submitReply(parentId: string): void {
    const content = this.replyText.trim();
    if (!content) return;
    this.commentsService
      .addComment(this.tripId, this.targetType, this.targetId, content, parentId)
      .subscribe({
        next: () => {
          this.replyText = '';
          this.replyingTo.set(null);
        },
      });
  }

  toggleReaction(commentId: string, emoji: string): void {
    this.commentsService.toggleReaction(this.tripId, commentId, emoji).subscribe();
  }

  hasReacted(comment: TripComment, emoji: string): boolean {
    const userId = this.auth.user()?.googleId;
    if (!userId || !comment.reactions?.[emoji]) return false;
    return comment.reactions[emoji].includes(userId);
  }

  getReactionCount(comment: TripComment, emoji: string): number {
    return comment.reactions?.[emoji]?.length ?? 0;
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
