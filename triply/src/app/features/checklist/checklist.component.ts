import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ChecklistService } from '../../core/services/checklist.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { ChecklistItem } from '../../core/models/trip.models';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule],
  templateUrl: './checklist.component.html',
  styleUrl: './checklist.component.scss',
})
export class ChecklistComponent implements OnInit {
  protected readonly checklist = inject(ChecklistService);
  protected readonly tripState = inject(TripStateService);

  readonly showAddForm = signal(false);
  readonly filterCategory = signal<string>('');

  newLabel = '';
  newCategory: ChecklistItem['category'] = 'logistics';
  newPriority: ChecklistItem['priority'] = 'medium';
  newDueDate = '';

  readonly categoryOrder: ChecklistItem['category'][] = ['documents', 'finance', 'logistics', 'packing', 'health'];

  ngOnInit(): void {
    if (this.checklist.items().length === 0) {
      this.checklist.regenerate();
    }
  }

  filteredCategories(): string[] {
    const groups = this.checklist.byCategory();
    const filter = this.filterCategory();
    if (filter) return Object.keys(groups).filter(k => k === filter);
    return this.categoryOrder.filter(c => groups[c]?.length > 0);
  }

  addItem(): void {
    if (!this.newLabel.trim()) return;
    this.checklist.addManual({
      category: this.newCategory,
      label: this.newLabel.trim(),
      dueDate: this.newDueDate || null,
      priority: this.newPriority,
    });
    this.newLabel = '';
    this.newDueDate = '';
    this.showAddForm.set(false);
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
}
