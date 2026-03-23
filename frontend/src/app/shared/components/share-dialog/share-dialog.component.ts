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
        <div class="header-icon-wrap"><mat-icon class="header-icon">share</mat-icon></div>
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
      padding: 8px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 28px;

      .header-icon-wrap {
        width: 44px; height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(108,92,231,0.12), rgba(108,92,231,0.04));
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }

      .header-icon {
        font-size: 22px; width: 22px; height: 22px;
        color: #6C5CE7;
      }

      h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #1a1a2e;
        letter-spacing: -0.01em;
      }
    }

    .link-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .link-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: #fafafa;
      border-radius: 12px;
      border: 1px solid #eee;
    }

    .toggle-info {
      display: flex; align-items: center; gap: 10px;

      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #6C5CE7; }
    }

    .toggle-label {
      font-size: 0.92rem;
      font-weight: 600;
      color: #1a1a2e;
    }

    .link-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .link-url-row {
      display: flex; align-items: center; gap: 4px;
      background: #f5f3ff;
      border-radius: 10px;
      padding: 4px 4px 4px 14px;
      border: 1px solid rgba(108,92,231,0.15);
    }

    .link-input {
      flex: 1; border: none; background: transparent;
      font-size: 0.8rem; font-family: 'SF Mono', 'Consolas', monospace;
      color: #5b4ccc; outline: none; min-width: 0;
      font-weight: 500;
    }

    .copy-btn {
      flex-shrink: 0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6C5CE7; }
    }

    .copied-feedback {
      font-size: 0.75rem; color: #10b981; font-weight: 600;
      padding-left: 4px;
    }

    .whatsapp-btn {
      background: linear-gradient(135deg, #25D366, #20bd5a) !important;
      color: #fff !important;
      font-weight: 600;
      border-radius: 10px !important;
      padding: 0 20px !important;
      height: 40px;
      box-shadow: 0 2px 8px rgba(37, 211, 102, 0.25);

      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 8px; }
    }

    .link-disabled-msg {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.84rem; color: #999; margin: 0;
      padding: 14px 16px;
      background: #f9f9f9;
      border-radius: 10px;
      border: 1px dashed #e0e0e0;

      mat-icon { font-size: 18px; width: 18px; height: 18px; opacity: 0.4; }
    }

    mat-divider { margin: 8px 0 20px; }

    .invite-section { margin-bottom: 20px; }

    .invite-btn {
      width: 100%;
      font-weight: 600;
      color: #6C5CE7;
      border-color: rgba(108,92,231,0.3) !important;
      border-radius: 10px !important;
      height: 44px;
      font-size: 0.9rem;
      transition: all 0.2s;

      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 8px; }

      &:hover {
        background: rgba(108,92,231,0.06) !important;
        border-color: #6C5CE7 !important;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;

      button { color: #999; font-weight: 500; }
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
