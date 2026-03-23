import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ChecklistService } from '../../core/services/checklist.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { CollaborationService } from '../../core/services/collaboration.service';
import { AuthService } from '../../core/services/auth.service';
import { ChecklistItem } from '../../core/models/trip.models';
import { ChecklistAddDialogComponent, ChecklistAddDialogResult } from '../../shared/components/checklist-add-dialog/checklist-add-dialog.component';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, TranslatePipe],
  templateUrl: './checklist.component.html',
  styleUrl: './checklist.component.scss',
})
export class ChecklistComponent implements OnInit {
  protected readonly checklist = inject(ChecklistService);
  protected readonly tripState = inject(TripStateService);
  protected readonly collabService = inject(CollaborationService);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly filterCategory = signal<string>('');
  readonly filterMyTasks = signal(false);

  readonly hasCollaborators = computed(() => this.collabService.collaborators().length > 1);

  readonly categoryOrder: ChecklistItem['category'][] = ['documents', 'finance', 'logistics', 'packing', 'health'];

  ngOnInit(): void {
    // If no saved items, generate from trip rules
    const saved = this.tripState.trip().checklist ?? [];
    if (saved.length === 0) {
      this.checklist.regenerate();
    }
  }

  filteredCategories(): string[] {
    const groups = this.checklist.byCategory();
    const filter = this.filterCategory();
    if (filter) return Object.keys(groups).filter(k => k === filter);
    return this.categoryOrder.filter(c => groups[c]?.length > 0);
  }

  openAddDialog(): void {
    const ref = this.dialog.open(ChecklistAddDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'mobile-fullscreen-dialog',
    });
    ref.afterClosed().subscribe((result: ChecklistAddDialogResult | undefined) => {
      if (!result) return;
      this.checklist.addManual({
        category: result.category,
        label: result.label,
        dueDate: result.dueDate,
        priority: result.priority,
      });
    });
  }

  formatDueDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  isOverdue(item: ChecklistItem): boolean {
    if (!item.dueDate || item.isChecked) return false;
    return item.dueDate < new Date().toISOString().split('T')[0];
  }

  toggleMyTasks(): void {
    this.filterMyTasks.update((v) => !v);
  }

  assignItem(item: ChecklistItem, userId: string | null): void {
    if (!userId) {
      this.checklist.updateItem({ ...item, assigneeUserId: null, assigneeName: null, assigneePicture: null });
      return;
    }
    const collab = this.collabService.collaborators().find((c) => c.userId === userId);
    if (collab) {
      this.checklist.updateItem({
        ...item,
        assigneeUserId: collab.userId,
        assigneeName: collab.name,
        assigneePicture: collab.picture,
      });
    }
  }

  getFilteredItems(items: ChecklistItem[]): ChecklistItem[] {
    if (!this.filterMyTasks()) return items;
    const userId = this.auth.user()?.googleId;
    return items.filter((i) => i.assigneeUserId === userId);
  }
}
