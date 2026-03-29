import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { CdkDrag, CdkDropList, CdkDragPreview } from '@angular/cdk/drag-drop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ItineraryItemType } from '../../../core/models/trip.models';
import { MatBottomSheet, MatBottomSheetModule, MatBottomSheetRef } from '@angular/material/bottom-sheet';

export interface BlockDef {
  type: ItineraryItemType;
  label: string;
  icon: string;
  color: string;
}

const BLOCKS: BlockDef[] = [
  { type: 'flight', label: 'Voo', icon: 'flight', color: '#2196F3' },
  { type: 'stay', label: 'Hotel', icon: 'hotel', color: '#f97316' },
  { type: 'activity', label: 'Atividade', icon: 'local_activity', color: '#43A047' },
  { type: 'transport', label: 'Transporte', icon: 'directions_bus', color: '#78909C' },
  { type: 'car-rental', label: 'Carro', icon: 'directions_car', color: '#607D8B' },
  { type: 'trajectory', label: 'Trajeto', icon: 'moving', color: '#8B5CF6' },
  { type: 'custom', label: 'Outro', icon: 'edit_note', color: '#9E9E9E' },
];

@Component({
  selector: 'app-block-panel',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, CdkDrag, CdkDropList, CdkDragPreview, MatBottomSheetModule],
  template: `
    <!-- Desktop: floating side panel -->
    @if (!isMobile()) {
      <div class="block-panel" [class.expanded]="expanded()">
        <button class="panel-toggle" (click)="toggleExpanded()" matTooltip="Blocos de montagem">
          <mat-icon>{{ expanded() ? 'chevron_right' : 'extension' }}</mat-icon>
        </button>

        <div class="panel-blocks" cdkDropList id="block-palette"
             [cdkDropListData]="blocks"
             [cdkDropListSortingDisabled]="true"
             [cdkDropListConnectedTo]="connectedListIds">
          @for (block of blocks; track block.type) {
            <div class="block-item" cdkDrag [cdkDragData]="block.type"
                 [style.--block-color]="block.color"
                 [matTooltip]="block.label" matTooltipPosition="left" [matTooltipShowDelay]="300">
              <div class="block-icon-wrap">
                <mat-icon>{{ block.icon }}</mat-icon>
              </div>
              @if (expanded()) {
                <span class="block-label">{{ block.label }}</span>
              }

              <!-- Drag preview -->
              <div *cdkDragPreview class="block-drag-preview" [style.--block-color]="block.color">
                <mat-icon>{{ block.icon }}</mat-icon>
                <span>{{ block.label }}</span>
              </div>

            </div>
          }
        </div>
      </div>
    }

    <!-- Mobile: FAB button -->
    @if (isMobile()) {
      <button class="mobile-fab" mat-fab color="primary" (click)="openBottomSheet()">
        <mat-icon>extension</mat-icon>
      </button>
    }
  `,
  styles: [`
    :host { display: contents; }

    .block-panel {
      position: fixed;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 90;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      transition: width 0.25s ease, padding 0.25s ease;
      width: 56px;

      &.expanded {
        width: 140px;
        padding: 10px 12px;
      }
    }

    .panel-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.2s;

      &:hover { background: rgba(255, 255, 255, 0.2); }
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    .panel-blocks {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }

    .block-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 4px;
      border-radius: 10px;
      cursor: grab;
      transition: background 0.2s, transform 0.15s;
      color: rgba(255, 255, 255, 0.85);

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.03);
      }

      &:active { cursor: grabbing; }
    }

    .block-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--block-color) 20%, transparent);
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--block-color);
      }
    }

    .block-label {
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .block-drag-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px 12px 14px;
      min-width: 180px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06);
      font-size: 0.9rem;
      font-weight: 700;
      color: #333;
      border-left: 4px solid var(--block-color);

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        color: var(--block-color);
        background: color-mix(in srgb, var(--block-color) 12%, #fff);
        padding: 6px;
        border-radius: 8px;
        box-sizing: content-box;
      }

      span {
        letter-spacing: 0.02em;
      }
    }

    .mobile-fab {
      position: fixed;
      right: 16px;
      bottom: 80px;
      z-index: 90;
    }
  `],
})
export class BlockPanelComponent {
  readonly blocks = BLOCKS;
  readonly expanded = signal(false);
  readonly isMobile = signal(false);
  readonly connectedListIds: string[] = [];

  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly bottomSheet = inject(MatBottomSheet);

  readonly mobileBlockSelected = output<ItineraryItemType>();

  toggleExpanded(): void {
    this.expanded.update(v => !v);
  }

  constructor() {
    this.breakpointObserver.observe('(max-width: 768px)').subscribe(result => {
      this.isMobile.set(result.matches);
    });
  }

  setConnectedLists(ids: string[]): void {
    this.connectedListIds.length = 0;
    this.connectedListIds.push(...ids);
  }

  openBottomSheet(): void {
    const ref = this.bottomSheet.open(BlockBottomSheetComponent);
    ref.afterDismissed().subscribe(type => {
      if (type) this.mobileBlockSelected.emit(type);
    });
  }
}

@Component({
  selector: 'app-block-bottom-sheet',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule],
  template: `
    <div class="sheet-content">
      <div class="sheet-title">
        <mat-icon>extension</mat-icon>
        <span>Adicionar item</span>
      </div>
      <div class="sheet-blocks">
        @for (block of blocks; track block.type) {
          <button class="sheet-block" (click)="select(block.type)" [style.--block-color]="block.color">
            <div class="sheet-icon">
              <mat-icon>{{ block.icon }}</mat-icon>
            </div>
            <span>{{ block.label }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .sheet-content { padding: 16px 16px 24px; }

    .sheet-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--triply-text-primary, #1a1a2e);

      mat-icon { color: var(--triply-primary, #f97316); }
    }

    .sheet-blocks {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .sheet-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 8px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 12px;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--triply-text-primary, #1a1a2e);

      &:active {
        transform: scale(0.95);
        background: rgba(0, 0, 0, 0.03);
      }
    }

    .sheet-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--block-color) 12%, transparent);

      mat-icon { color: var(--block-color); }
    }
  `],
})
export class BlockBottomSheetComponent {
  readonly blocks = BLOCKS;
  private readonly sheetRef = inject(MatBottomSheetRef);

  select(type: ItineraryItemType): void {
    this.sheetRef.dismiss(type);
  }
}
