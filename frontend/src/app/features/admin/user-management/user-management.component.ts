import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { PresenceService } from '../../../core/services/presence.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MATERIAL_IMPORTS, TranslatePipe],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly presence = inject(PresenceService);
  protected readonly i18n = inject(TranslationService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const all = this.users();
    if (!q) return all;
    return all.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.presence.connect();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.presence.disconnect();
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);

        // Load initial online status
        this.adminService.getOnlineUsers().subscribe({
          next: (ids) => this.presence.loadOnlineUsers(ids),
        });
      },
      error: () => {
        this.notify.error(this.i18n.t('admin.errorLoadUsers'));
        this.loading.set(false);
      },
    });
  }

  onRoleChange(user: AdminUser, role: 'USER' | 'ADMIN'): void {
    this.adminService.updateRole(user.id, role).subscribe({
      next: () => {
        this.users.update(users =>
          users.map(u => u.id === user.id ? { ...u, role } : u)
        );
        this.notify.success(`Role de ${user.name} alterada para ${role}`);
      },
      error: () => this.notify.error(this.i18n.t('admin.errorChangeRole')),
    });
  }

  onToggleActive(user: AdminUser): void {
    const isActive = !user.isActive;
    this.adminService.toggleActive(user.id, isActive).subscribe({
      next: () => {
        this.users.update(users =>
          users.map(u => u.id === user.id ? { ...u, isActive } : u)
        );
        this.notify.success(`${user.name} ${isActive ? 'ativado' : 'desativado'}`);
      },
      error: () => this.notify.error(this.i18n.t('admin.errorChangeStatus')),
    });
  }

  onPlanChange(user: AdminUser, plan: 'FREE' | 'PRO' | 'BUSINESS'): void {
    this.adminService.updatePlan(user.id, plan).subscribe({
      next: () => {
        this.users.update(users =>
          users.map(u => u.id === user.id ? { ...u, plan } : u)
        );
        this.notify.success(`Plano de ${user.name} alterado para ${plan}`);
      },
      error: () => this.notify.error(this.i18n.t('admin.errorChangePlan')),
    });
  }

  isCurrentUser(user: AdminUser): boolean {
    return this.auth.user()?.email === user.email;
  }

  viewUserDetail(userId: string): void {
    this.router.navigate(['/admin/usuarios', userId]);
  }
}
