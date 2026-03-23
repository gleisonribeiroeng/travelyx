import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { AdminService, AdminUserDetail, AdminTripSummary } from '../../../core/services/admin.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, MATERIAL_IMPORTS, TranslatePipe],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  protected readonly i18n = inject(TranslationService);

  readonly user = signal<AdminUserDetail | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/admin/usuarios']); return; }

    this.adminService.getUserDetail(id).subscribe({
      next: (detail) => {
        this.user.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/admin/usuarios']);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/usuarios']);
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      planejamento: 'edit_calendar',
      ativa: 'flight_takeoff',
      concluida: 'check_circle',
    };
    return map[status] || 'help';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      planejamento: this.i18n.t('status.planning'),
      ativa: this.i18n.t('status.active'),
      concluida: this.i18n.t('status.completed'),
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const lang = this.i18n.lang();
    return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  formatDateRange(start: string, end: string): string {
    if (!start && !end) return '—';
    return `${this.formatDate(start)} → ${this.formatDate(end)}`;
  }

  getTotalItems(trip: AdminTripSummary): number {
    const c = trip.counts;
    return c.flights + c.stays + c.carRentals + c.activities + c.attractions;
  }

  getPlanClass(plan: string): string {
    return `plan-${plan.toLowerCase()}`;
  }
}
