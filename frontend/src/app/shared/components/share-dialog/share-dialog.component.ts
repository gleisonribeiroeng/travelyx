import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InviteDialogComponent, InviteDialogData } from '../invite-dialog/invite-dialog.component';

export interface ShareDialogData {
  tripId: string;
  tripName: string;
  destination: string;
  publicSlug: string | null;
}

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  template: `
    <div class="share-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <mat-icon class="header-icon">share</mat-icon>
        <h2>{{ 'collab.share' | translate }}</h2>
      </div>

      <!-- Public Link Toggle -->
      <div class="link-section">
        <div class="link-toggle-row">
          <div class="toggle-info">
            <mat-icon>link</mat-icon>
            <span class="toggle-label">{{ 'collab.shareLink' | translate }}</span>
          </div>
          <mat-slide-toggle
            [checked]="linkEnabled()"
            (change)="toggleLink()"
            [disabled]="toggling()"
            color="primary"
          ></mat-slide-toggle>
        </div>

        @if (linkEnabled()) {
          <div class="link-box">
            <div class="link-url-row">
              <input class="link-input" [value]="publicUrl()" readonly />
              <button mat-icon-button class="copy-btn" (click)="copyLink()" [matTooltip]="'collab.copyLink' | translate">
                <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
            @if (copied()) {
              <span class="copied-feedback">{{ 'collab.linkCopied' | translate }}</span>
            }
          </div>

          <button mat-flat-button class="whatsapp-btn" (click)="shareWhatsApp()">
            <mat-icon>chat</mat-icon>
            {{ 'collab.shareWhatsApp' | translate }}
          </button>
        } @else {
          <p class="link-disabled-msg">
            <mat-icon>link_off</mat-icon>
            {{ 'collab.shareLinkDesc' | translate }}
          </p>
        }
      </div>

      <mat-divider></mat-divider>

      <!-- Invite Action -->
      <div class="invite-section">
        <button mat-stroked-button class="invite-btn" (click)="openInviteDialog()">
          <mat-icon>person_add</mat-icon>
          {{ 'collab.invitePeople' | translate }}
        </button>
      </div>

      <!-- Close -->
      <div class="dialog-actions">
        <button mat-button (click)="dialogRef.close()">{{ 'common.close' | translate }}</button>
      </div>
    </div>
  `,
  styles: [`
    .share-dialog {
      max-width: 480px;
      width: 100%;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;

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

    .link-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 20px;
    }

    .link-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .toggle-info {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--triply-primary, #6C5CE7);
      }
    }

    .toggle-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--triply-text-primary, #1a1a2e);
    }

    .link-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .link-url-row {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--triply-surface-2, #f5f5f5);
      border-radius: var(--triply-radius-md, 12px);
      padding: 4px 4px 4px 14px;
      border: 1px solid var(--triply-border-subtle, #e0e0e0);
    }

    .link-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.82rem;
      font-family: monospace;
      color: var(--triply-text-primary, #1a1a2e);
      outline: none;
      min-width: 0;
    }

    .copy-btn {
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .copied-feedback {
      font-size: 0.75rem;
      color: #4CAF50;
      font-weight: 600;
      padding-left: 4px;
    }

    .whatsapp-btn {
      background: #25D366 !important;
      color: #fff !important;
      font-weight: 600;
      align-self: flex-start;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 6px;
      }
    }

    .link-disabled-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--triply-text-secondary, #999);
      margin: 0;
      padding: 12px 16px;
      background: var(--triply-surface-2, #f5f5f5);
      border-radius: var(--triply-radius-md, 12px);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        opacity: 0.5;
      }
    }

    mat-divider {
      margin: 4px 0 16px;
    }

    .invite-section {
      margin-bottom: 16px;
    }

    .invite-btn {
      width: 100%;
      font-weight: 600;
      color: var(--triply-primary, #6C5CE7);
      border-color: var(--triply-primary, #6C5CE7);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 6px;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
    }
  `],
})
export class ShareDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ShareDialogComponent>);
  private readonly data: ShareDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialog);
  private readonly collabService = inject(CollaborationService);
  private readonly notify = inject(NotificationService);
  private readonly i18n = inject(TranslationService);

  readonly linkEnabled = signal(false);
  readonly currentSlug = signal<string | null>(null);
  readonly toggling = signal(false);
  readonly copied = signal(false);

  readonly publicUrl = signal('');

  ngOnInit(): void {
    this.currentSlug.set(this.data.publicSlug ?? null);
    this.linkEnabled.set(!!this.data.publicSlug);
    this.updateUrl();
  }

  private updateUrl(): void {
    const slug = this.currentSlug();
    if (slug) {
      this.publicUrl.set(`${window.location.origin}/v/${slug}`);
    }
  }

  toggleLink(): void {
    this.toggling.set(true);
    this.collabService.toggleShareLink(this.data.tripId).subscribe({
      next: (res) => {
        this.currentSlug.set(res.publicSlug);
        this.linkEnabled.set(!!res.publicSlug);
        this.updateUrl();
        this.toggling.set(false);
        if (res.publicSlug) {
          this.notify.success(this.i18n.t('collab.linkGenerated'));
        } else {
          this.notify.success(this.i18n.t('collab.linkRemoved'));
        }
      },
      error: () => {
        this.toggling.set(false);
      },
    });
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.publicUrl());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }

  shareWhatsApp(): void {
    const text = encodeURIComponent(
      this.i18n.t('collab.whatsAppMessage', { destination: this.data.destination, url: this.publicUrl() })
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  openInviteDialog(): void {
    this.dialog.open(InviteDialogComponent, {
      width: '480px',
      panelClass: 'mobile-fullscreen-dialog',
      data: { tripId: this.data.tripId } as InviteDialogData,
    });
  }
}
