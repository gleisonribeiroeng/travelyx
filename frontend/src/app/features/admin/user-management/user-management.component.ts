import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, MATERIAL_IMPORTS],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Erro ao carregar usuários');
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
      error: () => this.notify.error('Erro ao alterar role'),
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
      error: () => this.notify.error('Erro ao alterar status'),
    });
  }

  isCurrentUser(user: AdminUser): boolean {
    return this.auth.user()?.email === user.email;
  }
}
