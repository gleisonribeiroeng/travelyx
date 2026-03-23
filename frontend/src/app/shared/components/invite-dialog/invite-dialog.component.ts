import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Collaborator, CollaboratorRole } from '../../../core/models/collaboration.models';

export interface InviteDialogData {
  tripId: string;
}

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="invite-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <mat-icon class="header-icon">group_add</mat-icon>
        <h2>{{ 'collab.invitePeople' | translate }}</h2>
      </div>

      <!-- Invite Form -->
      <div class="invite-form">
        <mat-form-field appearance="outline" class="email-field">
          <mat-label>{{ 'collab.email' | translate }}</mat-label>
          <input matInput type="email" [(ngModel)]="email" placeholder="amigo@email.com"
                 (keydown.enter)="sendInvite()" />
          <mat-icon matPrefix>email</mat-icon>
          @if (emailError()) {
            <mat-error>{{ emailError() }}</mat-error>
          }
        </mat-form-field>

        <!-- Role Selector -->
        <div class="role-selector">
          <span class="role-label">{{ 'collab.role' | translate }}</span>
          <div class="role-cards">
            <button class="role-card" [class.selected]="selectedRole() === 'EDITOR'"
                    (click)="selectedRole.set('EDITOR')">
              <mat-icon>edit</mat-icon>
              <div class="role-info">
                <span class="role-name">{{ 'collab.roleEditor' | translate }}</span>
                <span class="role-desc">{{ 'collab.roleEditorDesc' | translate }}</span>
              </div>
              @if (selectedRole() === 'EDITOR') {
                <mat-icon class="check-icon">check_circle</mat-icon>
              }
            </button>
            <button class="role-card" [class.selected]="selectedRole() === 'VIEWER'"
                    (click)="selectedRole.set('VIEWER')">
              <mat-icon>visibility</mat-icon>
              <div class="role-info">
                <span class="role-name">{{ 'collab.roleViewer' | translate }}</span>
                <span class="role-desc">{{ 'collab.roleViewerDesc' | translate }}</span>
              </div>
              @if (selectedRole() === 'VIEWER') {
                <mat-icon class="check-icon">check_circle</mat-icon>
              }
            </button>
          </div>
        </div>

        <button mat-raised-button color="primary" class="send-btn"
                [disabled]="sending() || !email.trim()" (click)="sendInvite()">
          @if (sending()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>send</mat-icon>
            {{ 'collab.sendInvite' | translate }}
          }
        </button>
      </div>

      <mat-divider></mat-divider>

      <!-- Current Collaborators -->
      <div class="collaborators-section">
        <h3>{{ 'collab.collaborators' | translate }}</h3>
        @if (collabService.collaborators().length === 0) {
          <p class="no-collabs">{{ 'collab.noCollaborators' | translate }}</p>
        } @else {
          <div class="collab-list">
            @for (collab of collabService.collaborators(); track collab.id) {
              <div class="collab-row">
                <div class="collab-avatar">
                  @if (collab.picture) {
                    <img [src]="collab.picture" [alt]="collab.name" />
                  } @else {
                    <span class="avatar-initial">{{ collab.name?.charAt(0)?.toUpperCase() }}</span>
                  }
                </div>
                <div class="collab-info">
                  <span class="collab-name">{{ collab.name }}</span>
                  <span class="collab-email">{{ collab.email }}</span>
                </div>
                <span class="role-badge" [class]="'badge-' + collab.role.toLowerCase()">
                  {{ getRoleLabel(collab.role) }}
                </span>
                @if (collab.role !== 'OWNER' && collabService.isOwner()) {
                  <button mat-icon-button class="remove-btn"
                          (click)="removeCollaborator(collab)" [matTooltip]="'Remover'">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Close -->
      <div class="dialog-actions">
        <button mat-button (click)="dialogRef.close()">{{ 'common.close' | translate }}</button>
      </div>
    </div>
  `,
  styles: [`
    .invite-dialog {
      max-width: 480px;
      width: 100%;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;

      .header-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--triply-primary, #6C5CE7);
      }

      h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--triply-text-primary, #1a1a2e);
      }
    }

    .invite-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .email-field {
      width: 100%;
    }

    .role-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .role-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--triply-text-secondary, #666);
    }

    .role-cards {
      display: flex;
      gap: 10px;
    }

    .role-card {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border: 2px solid var(--triply-border-subtle, #e0e0e0);
      border-radius: var(--triply-radius-md, 12px);
      background: var(--triply-surface-1, #fff);
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      text-align: left;
      position: relative;

      > mat-icon:first-child {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--triply-text-secondary, #666);
        margin-top: 2px;
        flex-shrink: 0;
      }

      &:hover {
        border-color: var(--triply-primary, #6C5CE7);
        background: rgba(108, 92, 231, 0.03);
      }

      &.selected {
        border-color: var(--triply-primary, #6C5CE7);
        background: rgba(108, 92, 231, 0.06);

        > mat-icon:first-child {
          color: var(--triply-primary, #6C5CE7);
        }
      }
    }

    .role-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .role-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--triply-text-primary, #1a1a2e);
    }

    .role-desc {
      font-size: 0.72rem;
      color: var(--triply-text-secondary, #666);
      line-height: 1.3;
    }

    .check-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--triply-primary, #6C5CE7);
      position: absolute;
      top: 8px;
      right: 8px;
    }

    .send-btn {
      align-self: flex-start;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    mat-divider {
      margin: 4px 0 16px;
    }

    .collaborators-section {
      margin-bottom: 16px;

      h3 {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--triply-text-primary, #1a1a2e);
        margin: 0 0 12px;
      }
    }

    .no-collabs {
      font-size: 0.85rem;
      color: var(--triply-text-secondary, #999);
      margin: 0;
    }

    .collab-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .collab-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--triply-radius-sm, 8px);
      transition: background 0.15s ease;

      &:hover {
        background: var(--triply-surface-2, #f5f5f5);
      }
    }

    .collab-avatar {
      width: 36px;
      height: 36px;
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
        font-weight: 700;
        font-size: 0.85rem;
      }
    }

    .collab-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .collab-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--triply-text-primary, #1a1a2e);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .collab-email {
      font-size: 0.72rem;
      color: var(--triply-text-secondary, #999);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role-badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 10px;
      border-radius: 20px;
      flex-shrink: 0;
    }

    .badge-owner {
      background: rgba(108, 92, 231, 0.12);
      color: var(--triply-primary, #6C5CE7);
    }

    .badge-editor {
      background: rgba(76, 175, 80, 0.12);
      color: #4CAF50;
    }

    .badge-viewer {
      background: rgba(158, 158, 158, 0.12);
      color: #9e9e9e;
    }

    .remove-btn {
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--triply-text-tertiary, #bbb);
      }

      &:hover mat-icon {
        color: #f44336;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 480px) {
      .role-cards {
        flex-direction: column;
      }
    }
  `],
})
export class InviteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<InviteDialogComponent>);
  private readonly data: InviteDialogData = inject(MAT_DIALOG_DATA);
  readonly collabService = inject(CollaborationService);
  private readonly notify = inject(NotificationService);
  private readonly i18n = inject(TranslationService);

  email = '';
  readonly selectedRole = signal<CollaboratorRole>('EDITOR');
  readonly sending = signal(false);
  readonly emailError = signal('');

  getRoleLabel(role: CollaboratorRole): string {
    const map: Record<string, string> = {
      OWNER: this.i18n.t('collab.roleOwner'),
      EDITOR: this.i18n.t('collab.roleEditor'),
      VIEWER: this.i18n.t('collab.roleViewer'),
    };
    return map[role] || role;
  }

  sendInvite(): void {
    const email = this.email.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.emailError.set('E-mail inválido');
      return;
    }

    this.emailError.set('');
    this.sending.set(true);

    this.collabService.invite(this.data.tripId, email, this.selectedRole()).subscribe({
      next: () => {
        this.notify.success(this.i18n.t('collab.inviteSent'));
        this.email = '';
        this.sending.set(false);
        // Reload collaborators to refresh the list
        this.collabService.loadCollaborators(this.data.tripId);
      },
      error: () => {
        this.notify.error(this.i18n.t('collab.inviteError'));
        this.sending.set(false);
      },
    });
  }

  removeCollaborator(collab: Collaborator): void {
    if (!confirm(this.i18n.t('collab.removeConfirm'))) return;
    this.collabService.removeCollaborator(this.data.tripId, collab.id).subscribe({
      next: () => this.notify.success(this.i18n.t('collab.removed')),
    });
  }
}
