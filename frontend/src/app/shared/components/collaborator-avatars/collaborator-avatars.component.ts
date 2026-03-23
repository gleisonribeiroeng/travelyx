import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { Collaborator } from '../../../core/models/collaboration.models';

@Component({
  selector: 'app-collaborator-avatars',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule],
  template: `
    <div
      class="avatar-row"
      [class.size-sm]="size === 'sm'"
      [class.size-md]="size === 'md'"
      (click)="avatarClick.emit()"
      role="button"
      tabindex="0"
    >
      @for (collab of visibleCollabs(); track collab.id; let i = $index) {
        <div
          class="avatar"
          [style.z-index]="maxVisible - i"
          [style.margin-left.px]="i === 0 ? 0 : -8"
          [matTooltip]="collab.name"
        >
          @if (collab.picture) {
            <img [src]="collab.picture" [alt]="collab.name" />
          } @else {
            <span class="avatar-initial">{{ collab.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          }
        </div>
      }
      @if (overflowCount() > 0) {
        <div
          class="avatar overflow-avatar"
          [style.z-index]="0"
          [style.margin-left.px]="-8"
        >
          <span class="overflow-count">+{{ overflowCount() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; cursor: pointer; }

    .avatar-row {
      display: flex;
      align-items: center;
      transition: transform 0.15s ease;
    }

    .avatar-row:hover {
      transform: scale(1.05);
    }

    .avatar {
      border-radius: 50%;
      border: 2px solid #fff;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6C5CE7, #a29bfe);
      flex-shrink: 0;
      position: relative;
    }

    .size-md .avatar {
      width: 36px;
      height: 36px;
    }

    .size-sm .avatar {
      width: 28px;
      height: 28px;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-initial {
      color: #fff;
      font-weight: 700;
      line-height: 1;
    }

    .size-md .avatar-initial { font-size: 0.82rem; }
    .size-sm .avatar-initial { font-size: 0.68rem; }

    .overflow-avatar {
      background: var(--triply-surface-2, #e0e0e0);
    }

    .overflow-count {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--triply-text-secondary, #666);
    }

    .size-sm .overflow-count { font-size: 0.62rem; }
  `],
})
export class CollaboratorAvatarsComponent {
  @Input() collaborators: Collaborator[] = [];
  @Input() maxVisible = 4;
  @Input() size: 'sm' | 'md' = 'md';
  @Output() avatarClick = new EventEmitter<void>();

  readonly visibleCollabs = computed(() => {
    const list = this.collaborators ?? [];
    return list.slice(0, this.maxVisible);
  });

  readonly overflowCount = computed(() => {
    const list = this.collaborators ?? [];
    return Math.max(0, list.length - this.maxVisible);
  });
}
