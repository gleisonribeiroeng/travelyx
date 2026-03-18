import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { ConflictAlert } from '../../core/models/trip.models';
import { computeAllConflicts } from '../../core/utils/conflict-engine.util';

@Component({
  selector: 'app-conflicts',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  templateUrl: './conflicts.component.html',
  styleUrl: './conflicts.component.scss',
})
export class ConflictsComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly i18n = inject(TranslationService);

  readonly conflicts = computed<ConflictAlert[]>(() => {
    try {
      return computeAllConflicts(this.tripState.trip());
    } catch {
      return [];
    }
  });

  readonly errorCount = computed(() => this.conflicts().filter(c => c.severity === 'error').length);
  readonly warningCount = computed(() => this.conflicts().filter(c => c.severity === 'warning').length);
  readonly infoCount = computed(() => this.conflicts().filter(c => c.severity === 'info').length);

  readonly groupedConflicts = computed(() => {
    const all = this.conflicts();
    return {
      errors: all.filter(c => c.severity === 'error'),
      warnings: all.filter(c => c.severity === 'warning'),
      info: all.filter(c => c.severity === 'info'),
    };
  });

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'help';
    }
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      'time-overlap': 'schedule',
      'no-hotel': 'hotel',
      'impossible-transfer': 'directions_run',
      'booking-gap': 'event_busy',
      'checkout-mismatch': 'logout',
    };
    return map[type] || 'warning';
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'time-overlap': this.i18n.t('conflicts.typeTimeOverlap'),
      'no-hotel': this.i18n.t('conflicts.typeNoHotel'),
      'impossible-transfer': this.i18n.t('conflicts.typeImpossibleTransfer'),
      'booking-gap': this.i18n.t('conflicts.typeBookingGap'),
      'checkout-mismatch': this.i18n.t('conflicts.typeCheckoutMismatch'),
    };
    return map[type] || type;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }
}
