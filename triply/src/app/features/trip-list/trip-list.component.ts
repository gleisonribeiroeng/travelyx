import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { Trip, TripStatus } from '../../core/models/trip.models';
import { TripCreateDialogComponent, TripCreateDialogResult } from '../../shared/components/trip-create-dialog/trip-create-dialog.component';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, DatePipe],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly statusFilter = signal<string>('');

  readonly filteredTrips = computed(() => {
    const filter = this.statusFilter();
    const trips = this.tripState.trips();
    if (!filter) return trips;
    return trips.filter(t => t.status === filter);
  });

  openCreateDialog(): void {
    const ref = this.dialog.open(TripCreateDialogComponent, {
      width: '440px',
      panelClass: 'mobile-fullscreen-dialog',
    });

    ref.afterClosed().subscribe((result: TripCreateDialogResult | undefined) => {
      if (!result) return;
      this.tripState.createTrip(result).subscribe({
        next: (trip) => {
          this.notify.success('Viagem criada com sucesso!');
          this.router.navigate(['/viagem', trip.id, 'home']);
        },
        error: () => this.notify.error('Erro ao criar viagem'),
      });
    });
  }

  selectTrip(id: string): void {
    this.tripState.selectTrip(id);
    this.router.navigate(['/viagem', id, 'home']);
  }

  deleteTrip(id: string): void {
    if (!confirm('Tem certeza que deseja excluir esta viagem? Esta ação não pode ser desfeita.')) return;
    this.tripState.deleteTrip(id).subscribe({
      next: () => this.notify.success('Viagem excluída'),
      error: () => this.notify.error('Erro ao excluir viagem'),
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      planejamento: 'Planejamento',
      ativa: 'Ativa',
      concluida: 'Concluída',
    };
    return map[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      planejamento: 'accent',
      ativa: 'primary',
      concluida: '',
    };
    return colors[status] || '';
  }
}
