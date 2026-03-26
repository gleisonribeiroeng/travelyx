import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-viewer-banner',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  template: `
    @if (!dismissed()) {
      <div class="viewer-banner">
        <mat-icon class="banner-icon">visibility</mat-icon>
        <span class="banner-text">{{ 'collab.viewerBanner' | translate }}</span>
        <button mat-icon-button class="dismiss-btn" (click)="dismissed.set(true)">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    .viewer-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(33, 150, 243, 0.06) 100%);
      border: 1px solid rgba(249, 115, 22, 0.15);
      border-radius: var(--triply-radius-md, 12px);
      margin-bottom: var(--triply-spacing-md, 16px);
    }

    .banner-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--triply-primary, #f97316);
      flex-shrink: 0;
    }

    .banner-text {
      flex: 1;
      font-size: 0.85rem;
      color: var(--triply-text-secondary, #555);
      line-height: 1.4;
    }

    .dismiss-btn {
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--triply-text-tertiary, #bbb);
      }
    }
  `],
})
export class ViewerBannerComponent {
  readonly dismissed = signal(false);
}
