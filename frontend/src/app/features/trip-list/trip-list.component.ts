import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { Trip, TripStatus } from '../../core/models/trip.models';
import { TripCreateDialogComponent, TripCreateDialogResult, TripEditData } from '../../shared/components/trip-create-dialog/trip-create-dialog.component';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { tripToListItem } from '../../shared/components/list-item-base/list-item-mappers';
import { PlanService } from '../../core/services/plan.service';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, DatePipe, ListItemBaseComponent],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly planService = inject(PlanService);

  readonly statusFilter = signal<string>('');

  readonly filteredTrips = computed(() => {
    const filter = this.statusFilter();
    const trips = this.tripState.trips();
    if (!filter) return trips;
    return trips.filter(t => t.status === filter);
  });

  openCreateDialog(): void {
    if (!this.planService.canCreateTrip(this.tripState.trips().length)) {
      this.planService.showLimitPaywall('trip');
      return;
    }
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

  toListItem(trip: Trip) {
    return tripToListItem(trip);
  }

  openTrip(id: string): void {
    this.selectTrip(id);
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

  handleIconAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId === 'edit') this.editTrip(event.itemId);
    else if (event.actionId === 'cover') this.addCoverImage(event.itemId);
  }

  editTrip(id: string): void {
    const trip = this.tripState.trips().find(t => t.id === id);
    if (!trip) return;
    const ref = this.dialog.open(TripCreateDialogComponent, {
      width: '440px',
      panelClass: 'mobile-fullscreen-dialog',
      data: { name: trip.name, destination: trip.destination, dates: trip.dates } as TripEditData,
    });
    ref.afterClosed().subscribe((result: TripCreateDialogResult | undefined) => {
      if (!result) return;
      const prevActive = this.tripState.activeTripId();
      this.tripState.selectTrip(id);
      this.tripState.setTripMeta(result.name, result.destination, result.dates);
      if (prevActive && prevActive !== id) this.tripState.selectTrip(prevActive);
      this.notify.success('Viagem atualizada!');
    });
  }

  addCoverImage(id: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.tripState.setTripCoverImage(id, dataUrl);
        this.notify.success('Imagem de capa adicionada!');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
}
